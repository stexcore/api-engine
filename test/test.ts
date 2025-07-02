import Server from "../src/server/server";

const server = new Server({
    workdir: __dirname,
    port: 9001,
    mode: "compact",
    allowCircularServiceDeps: true
});

server.initialize()
    .then((loadTimeMs) => {
        console.log("Server ready on", loadTimeMs + "ms!");
    })
    .catch((err) => {
        console.error(err);
    });

// server.destroy();