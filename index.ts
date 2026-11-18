import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import { logger } from "./lib/logger";
import { GameEngine, type GameMode } from "./lib/game-engine";
import { setGameEngine } from "./routes/game";
import { setBetsGameEngine } from "./routes/bets";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  path: "/ws/socket.io",
});

function emitGameEvent(event: string, data: unknown, mode: GameMode) {
  io.to(`mode:${mode}`).emit(event, data);
}

const gameEngine = new GameEngine(emitGameEvent);
setGameEngine(gameEngine);
setBetsGameEngine(gameEngine);
gameEngine.start();

io.on("connection", (socket) => {
  logger.info({ socketId: socket.id }, "Client connected");

  socket.on("joinMode", (mode: string) => {
    const validModes: GameMode[] = ["30s", "1m", "3m"];
    if (validModes.includes(mode as GameMode)) {
      const prevRooms = [...socket.rooms].filter((r) => r.startsWith("mode:"));
      prevRooms.forEach((r) => socket.leave(r));
      socket.join(`mode:${mode}`);

      const state = gameEngine.getState(mode as GameMode);
      if (state) {
        socket.emit("gameState", state);
      }
    }
  });

  socket.on("disconnect", () => {
    logger.info({ socketId: socket.id }, "Client disconnected");
  });
});

httpServer.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
