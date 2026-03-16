import { connectDB } from './database/connection.js';
import { updateGameStats } from "./database/GameStats.js";
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { Player } from "./gameLogic/Player.js";
import { Game } from "./gameLogic/Game.js";
import ip from 'ip';

interface Session {
  host: WebSocket;
  players: Player[];
  clients: Map<WebSocket, string>;
  game: Game | null;
  waitingPlayers: Player[];
  turnReminders: Map<string, NodeJS.Timeout>;
  showdownReminders: Map<string, NodeJS.Timeout>;
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

function clearTurnReminder(session: Session, playerName: string) {
  const timer = session.turnReminders.get(playerName);
  if (timer) {
    clearInterval(timer);
    session.turnReminders.delete(playerName);
  }
}

function clearShowdownReminder(session: Session, playerName: string) {
  const timer = session.showdownReminders.get(playerName);
  if (timer) {
    clearInterval(timer);
    session.showdownReminders.delete(playerName);
  }
}

function startTurnReminder(
  session: Session,
  playerName: string,
  payloadFactory: () => any,
  intervalMs = 4000
) {
  clearTurnReminder(session, playerName);

  const sendReminder = () => {
    for (const [socket, name] of session.clients.entries()) {
      if (name === playerName && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payloadFactory()));
        break;
      }
    }
  };

  sendReminder(); // send immediately once

  const timer = setInterval(() => {
    sendReminder();
  }, intervalMs);

  session.turnReminders.set(playerName, timer);
}

function startShowdownReminder(
  session: Session,
  playerName: string,
  payloadFactory: () => any,
  intervalMs = 4000
) {
  clearShowdownReminder(session, playerName);

  const sendReminder = () => {
    for (const [socket, name] of session.clients.entries()) {
      if (name === playerName && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payloadFactory()));
        break;
      }
    }
  };

  sendReminder(); // send immediately once

  const timer = setInterval(() => {
    sendReminder();
  }, intervalMs);

  session.showdownReminders.set(playerName, timer);
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
      startTurnReminder(
        session,
        activePlayerName,
        () => {
          const activePlayer = game.players.find(p => p.name === activePlayerName);
          const minRaise = activePlayer
            ? activePlayer.currentBet + game.callingAmount + game.minRaise
            : game.callingAmount + game.minRaise;
  
          return {
            type: 'yourTurn',
            minRaise
          };
        },
        13000
      );
    };
  }

  for (let i = 0; i < 4; i++) {
    await game.collectBets();
    broadcast(session, { type: "players", players: game.players });
    game.nextPhase();
    game.players.forEach(p => {
      p.currentBet = 0;
    });
    broadcast(session, { type: "communityCards", cards: game.getCommunityCards(), potSize: game.getPot() });
  }

  const rankings = game.rankPlayers();
  const activePlayers = game.players.filter(p => p.participatingThisRound && !p.hasFolded);
  const playersWhoActed: Player[] = [];
  let turnCounter = 0;

  // Set up the callback for each player (just like notifyTurn)
  for (const player of game.players) {
    player.notifyShowdown = (activePlayerName) => {
      turnCounter++;
  
      const isLastPlayer = turnCounter === activePlayers.length;
  
      const previousPlayersShowedBoth = playersWhoActed.some(
        (p: Player) => p.showBothCards
      );
  
      const isLastStanding = isLastPlayer && !previousPlayersShowedBoth;
  
      startShowdownReminder(
        session,
        activePlayerName,
        () => ({
          type: 'showFoldedCards',
          isLastStanding
        }),
        6000
      );
  
      const actingPlayer = game.players.find((p: Player) => p.name === activePlayerName);
      if (actingPlayer && !playersWhoActed.includes(actingPlayer)) {
        playersWhoActed.push(actingPlayer);
      }
    };
  }

  await game.collectShowdownChoices();
  game.payOut(rankings)
  broadcast(session, { type: 'players', players: game.players });  
  for (const name of session.turnReminders.keys()) {
    clearTurnReminder(session, name);
  }
  for (const name of session.showdownReminders.keys()) {
    clearShowdownReminder(session, name);
  }
    
}};
  

async function main() {
  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
  
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Poker backend is running");
  });
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
      const playerName = session.clients.get(socket);
      if (playerName) {
        clearTurnReminder(session, playerName);
        clearShowdownReminder(session, playerName);
      }
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
            game: null,
            waitingPlayers: [],
            turnReminders: new Map(),
            showdownReminders: new Map()
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
            socket.send(JSON.stringify({ type: 'gameCode', code: gameCode}));
            socket.send(JSON.stringify({ type: 'players', players: session.players }));
          }
          break;
        }

        case 'join': {
          const newGameCode = data.gameCode;
          const session = sessions.get(newGameCode);

          if (session && newGameCode) {
            const existingPlayer = session.players.find(p => p.name === data.name);
            const existingWaiting = session.waitingPlayers.find(p => p.name === data.name);
            
            // Check if game is in progress or in progress
            const gameInProgress = session.game !== null;
            const gameFull = session.players.length >= 7;
            
            if (!existingPlayer && !existingWaiting) {
              const newPlayer = new Player(data.name);
              
              if (gameInProgress || gameFull) {
                session.waitingPlayers.push(newPlayer);
                socket.send(JSON.stringify({ 
                  type: 'waitingToJoin',
                  message: 'You will join after the current round ends'
                }));
              } else {
                session.players.push(newPlayer);
              }
              
              session.clients.set(socket, data.name);
              socketToGameCode.set(socket, newGameCode);
            } else {
              session.clients.set(socket, data.name);
            }
            
            broadcast(session, { type: "players", players: session.players });
          }
          break;
        }

        case 'startGame': {
          if (session && gameCode) {
            updateGameStats(session.players.length);
            
            const loopRounds = async () => {
              let dealerPosition = 0;
              while (true) {
                const playersWithCash = session.players.filter(p => p.chips > 0);
                if (playersWithCash.length < 2) break;

                // Handle add-ons and leaves
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

                let addedPlayers = 0;
                if (session.waitingPlayers.length > 0) {
                  while (session.waitingPlayers.length > 0 && session.players.length < 7) {
                    const waitingPlayer = session.waitingPlayers.shift()!; // Remove first player
                    session.players.push(waitingPlayer);
                    addedPlayers++;
                  }
                  broadcast(session, { type: 'players', players: session.players });
                  updateGameStats(session.players.length, addedPlayers);
                }
                

                const activePlayerNames = session.players.map(p => p.name);
                for (const [socket, name] of session.clients.entries()) {
                  if (activePlayerNames.includes(name) && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: 'gameStarted' }));
                    }
                  }
                for (const waitingPlayer of session.waitingPlayers) {
                  for (const [socket, name] of session.clients.entries()) {
                    if (name === waitingPlayer.name && socket.readyState === 1) {
                      socket.send(JSON.stringify({ 
                        type: 'stillWaiting'
                      }));
                    }
                  }
                }
                broadcast(session, { type: 'players', players: session.players });
                
                const game = new Game(session.players);
                session.game = game;
                await playRound(session, dealerPosition);
            
                await new Promise(resolve => setTimeout(resolve, 3000));

                

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
            clearTurnReminder(session, player.name);
            const number = Math.max(data.minRaise, data.amount);
            player.respondToBet(number);
              socket.send(JSON.stringify({ type: 'player', player }));
              broadcast(session, { type: 'players', players: session.players, minRaise: number });
          }
          break;
        }

        case 'call': {
          if (player && session && gameCode) {
            clearTurnReminder(session, player.name);
            player.called = true;
            player.respondToBet(-1);
              socket.send(JSON.stringify({ type: 'player', player }));
              broadcast(session, { type: 'players', players: session.players });
           
          }
          break;
        }

        case 'fold': {
          if (player && session && gameCode) {
            clearTurnReminder(session, player.name);
            player.respondToBet(-2);
            socket.send(JSON.stringify({ type: 'player', player }));
            broadcast(session, { type: 'players', players: session.players });
            
          }
          break;
        }

        case 'showLeftCard':
        case 'showRightCard':
        case 'showBothCards':
        case 'showNone': {  
          if (player && session && session.game) {
          clearShowdownReminder(session, player.name);
          player.showLeftCard = data.type === 'showLeftCard';
          player.showRightCard = data.type === 'showRightCard';
          player.showBothCards = data.type === 'showBothCards';
          player.showNone = data.type === 'showNone';
          player.respondToShowdown();

          broadcast(session, { type: 'players', players: session.players });
          broadcast(session, { 
            type: 'communityCards', 
            cards: session.game.getCommunityCards(), 
            potSize: session.game.getPot() 
          });
          
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
          if (session) {
            const playerName = session.clients.get(socket);
            let player = session.players.find(p => p.name === playerName);
            if (!player) {
              player = session.waitingPlayers.find(p => p.name === playerName);
            }
            
            if (player) {
              player.avatar = data.avatar;
              broadcast(session, { type: 'players', players: session.players });
            }
          }
          break;
        }
        

        default:
          console.log("Unknown message type:", data.type);
      }
    });
  });

  const localIP = ip.address();
  const port = parseInt(process.env.PORT || '3000', 10);
  const url = `http://${localIP}:${port}/PlayerLogin`;

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on port ${port}`);
    console.log(`Local URL: ${url}`);
  });
}

main();