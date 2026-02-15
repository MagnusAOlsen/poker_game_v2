import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { Player } from "./gameLogic/Player.ts";
import { Game } from "./gameLogic/Game.ts";
import ip from 'ip';
import { connectDB } from './database/connection.ts';
import { GameStats } from "./database/GameStats.ts";

interface Session {
  host: WebSocket;
  players: Player[];
  clients: Map<WebSocket, string>;
  game: Game | null;
}

async function broadcast(session: Session, message: any) {
  const msg = JSON.stringify(message);
  if (session.host.readyState === WebSocket.OPEN) {
    session.host.send(msg);
  }
  session.clients.forEach((name, client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    };
  });
}

async function playRound(session: Session, dealerPosition: number) {
  const game = session.game;
  broadcast(session, { type: 'shuffling'});
  await new Promise(resolve => setTimeout(resolve, 2000));
  if (game && session.clients) {
  game.startNewRound(dealerPosition);
  broadcast(session, { type: 'players', players: game.players });
  session.clients.forEach((playerName, socket) => {
    const player = game.players.find(p => p.name === playerName);
    if (player && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ 
        type: 'player', 
        player: player, // Contains Hand
        isMyTurn: game.currentPlayer?.name === player.name 
      }));
    }
  });

  
  broadcast(session, { type: "communityCards", cards: game.getCommunityCards(), potSize: game.getPot() });

  for (const player of game.players) {
    player.notifyTurn = (activePlayerName) => {
      for (const [socket, name] of session.clients.entries()) {
        if (name === activePlayerName && socket.readyState === WebSocket.OPEN) {
           socket.send(JSON.stringify({ type: 'yourTurn' }));
           break; 
        }
      }
    };
  }

  for (let i = 0; i < 4; i++) {
    await game.collectBets();
    broadcast(session, { type: "players", players: game.players });
    game.nextPhase();
    broadcast(session, { type: "communityCards", cards: game.getCommunityCards(), potSize: game.getPot() });
  }

  const rankings = game.rankPlayers();

  for (const [socket, name] of session.clients.entries()) {
    const player = game.players.find(p => p.name === name);
    if (player && !player.hasFolded && player.hand.length > 0 && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'showFoldedCards'}));
    }
  }
  await game.waitForAllPlayersToReveal();
  game.payOut(rankings)
  broadcast(session, { type: 'players', players: game.players });  
    
}};

async function updateGameStats(playerCount: number) {
  const stats = await GameStats.findOne();

  if (!stats) {
    // Create first record
    await GameStats.create({
      gamesPlayed: 1,
      averagePlayersPerGame: playerCount
    });
  } else {
    // Update existing record
    const newGamesPlayed = stats.gamesPlayed + 1;
    const newAverage = ((stats.averagePlayersPerGame * stats.gamesPlayed) + playerCount) / newGamesPlayed;

    stats.gamesPlayed = newGamesPlayed;
    stats.averagePlayersPerGame = newAverage;
    await stats.save();
  }
}
  

async function main() {
  const server = http.createServer();
  const wss = new WebSocketServer({ server });
  await connectDB();
  const sessions = new Map<string, Session>();
  const socketToGameCode = new Map<WebSocket, string>();

  wss.on('connection', async (socket) => {

    socket.on('close', () => {
      const code = socketToGameCode.get(socket);
      socketToGameCode.delete(socket);
      if (!code) return;
      const session = sessions.get(code);
      if (!session) return;
      session.clients.delete(socket);
    });

    socket.on('message', async (msg) => {
      const data = JSON.parse(msg.toString());
      const gameCode = socketToGameCode.get(socket);
      let session: Session | undefined;
      if (gameCode) {
        session = sessions.get(gameCode);
      }
      let player: Player | undefined;
      if (session) {
        const playerName = session.clients.get(socket);
        player = session.players.find(p => p.name === playerName);
      }

      switch (data.type) {
        case 'createCode': {
          const code = Math.random().toString(36).substring(2, 8).toUpperCase(); 
          const newSession: Session = {
            host: socket,
            players: [],
            clients: new Map(),
            game: null
          };
          sessions.set(code, newSession);
          socketToGameCode.set(socket, code);
          socket.send(JSON.stringify({ type: 'gameCode', code })); 
          break;
        }

        case'reconnectHost': {
          const gameCode = data.code;
          const session = sessions.get(gameCode);
          if (session && gameCode) {
            session.host = socket;
            socketToGameCode.set(socket, gameCode);
            socket.send(JSON.stringify({ type: 'gameCode', code: gameCode }));
            socket.send(JSON.stringify({ type: 'players', players: session.players }));
            socket.send(JSON.stringify({ type: 'players', players: session.players }));
          }
          break;
        }

        case 'join': {
          const newGameCode = data.gameCode;
          const session = sessions.get(newGameCode);

          if (session && newGameCode) {
            if (!session.players.find(p => p.name === data.name) && session.players.length < 7) {
              const newPlayer = new Player(data.name);
              session.players.push(newPlayer);
              session.clients.set(socket, data.name);
              socketToGameCode.set(socket, newGameCode);
          }
          session.clients.set(socket, data.name)
          broadcast(session, { type: "players", players: session.players });
          }
          break;
        }

        case 'startGame': {
          if (session && gameCode) {
          await updateGameStats(session.players.length);
          ;
          const loopRounds = async () => {
            let dealerPosition = 0;
            while (true) {
              const playersWithCash = session.players.filter(p => p.chips > 0);
              if (playersWithCash.length < 2) break;
              
              broadcast(session, { type: 'gameStarted' });
              broadcast(session, { type: 'players', players: session.players });
              
              const game = new Game(session.players);
              session.game = game;
              await playRound(session, dealerPosition);
          
              await new Promise(resolve => setTimeout(resolve, 3000));

              for (const player of session.players) {
                if (player.leave) {
                  session.players.splice(session.players.indexOf(player), 1);
                  const socketToDelete = [...session.clients.entries()].find(([_, name]) => name === player.name)?.[0];
                  if (socketToDelete) {
                    session.clients.delete(socketToDelete);
                  }
                }
                else if (player.addOn) {
                  player.chips = 150;
                  player.addOn = false;
                }
              }
          
              // Rotate dealer only to active players
              do {
                dealerPosition = (dealerPosition + 1) % session.players.length;
              } while (session.players[dealerPosition].chips === 0);
            }
          };
          
          loopRounds();
        }
          break;
        }

        //Reconnect players after every move so the amount of chips is always correct
        case 'reconnect': {
          const reconnectingName = data.name;
          const newGameCode = data.gameCode;
          const session = sessions.get(newGameCode);
          if (session && newGameCode) {
          const reconnectingPlayer = session.players.find(p => p.name === reconnectingName);
          if (reconnectingPlayer) {
            for (const [sock, name] of session.clients.entries()) {
              if (name === data.name && sock !== socket) {
                session.clients.delete(sock);
                sock.close();
              }
            }
            session.clients.set(socket, data.name);
            socketToGameCode.set(socket, newGameCode);
            socket.send(JSON.stringify({ type: 'player', player: reconnectingPlayer, isMyTurn: session.game?.currentPlayer?.name === reconnectingName }));
            
          }
        }
          break;
        }

        case 'raise': {
          if (player && session) {
            player.respondToBet(data.amount);
              socket.send(JSON.stringify({ type: 'player', player }));
              broadcast(session, { type: 'players', players: session.players });
          }
          break;
        }

        case 'call': {
          if (player && session && gameCode) {
            player.called = true;
            player.respondToBet(-1);
              socket.send(JSON.stringify({ type: 'player', player }));
              broadcast(session, { type: 'players', players: session.players });
           
          }
          break;
        }

        case 'fold': {
          if (player && session && gameCode) {
            player.respondToBet(-2);
            socket.send(JSON.stringify({ type: 'player', player }));
            broadcast(session, { type: 'players', players: session.players });
            
          }
          break;
        }

        case 'showLeftCard': {
          if (player && session && session.game) {
            player.showLeftCard = true;
            player.showRightCard = false;
            player.showBothCards = false;
            broadcast(session, { type: 'players', players: session.players });
            broadcast(session, { type: 'communityCards', cards: session.game.getCommunityCards() , potSize: session.game.getPot()});
            session.game.checkIfAllPlayersRevealed();
          }
          break;
        }
        
        case 'showRightCard': {
          if (player && session && session.game) {
            player.showLeftCard = false;
            player.showRightCard = true;
            player.showBothCards = false;
            broadcast(session, { type: 'players', players: session.players });
            broadcast(session, { type: 'communityCards', cards: session.game.getCommunityCards(), potSize: session.game.getPot() });
            session.game.checkIfAllPlayersRevealed(); 
          }
          break;
        }
        case 'showBothCards': {
          if (player && session && session.game) {
            player.showLeftCard = false;
            player.showRightCard = false;
            player.showBothCards = true;
            broadcast(session, { type: 'players', players: session.players });
            broadcast(session, { type: 'communityCards', cards: session.game.getCommunityCards(), potSize: session.game.getPot() });
            session.game.checkIfAllPlayersRevealed(); 
          }
          break;
        }

        case 'showNone': {
          if (player && session && session.game) {
            player.showLeftCard = false;
            player.showRightCard = false;
            player.showBothCards = false;
            player.showNone = true;
            broadcast(session, { type: 'players', players: session.players });
            broadcast(session, { type: 'communityCards', cards: session.game.getCommunityCards(), potSize: session.game.getPot() });
            session.game.checkIfAllPlayersRevealed(); 
          }
          break;
        }

        case 'addOn': {
          if (player) {
            player.addOn = true;
          }
          break;
        }
        
        case 'leave': {
          if (player) {
            player.leave = true;
          }
          break;
        }

        case 'chooseAvatar': {
          if (player && session) {
            player.avatar = data.avatar;
            broadcast(session, { type: 'players', players: session.players });
}
          break;
        }
        

        default:
          console.log("Unknown message type:", data.type);
      }
    });
  });

  const localIP = ip.address();
  const port = 3000;
  const url = `http://${localIP}:${port}/PlayerLogin`;

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on ${url}`);
  });
}

main();