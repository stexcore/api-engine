import Server from "../src/server/server";

const server = new Server({
    workdir: __dirname,
    port: 9001
});

server.initialize()
    .then(() => {
        console.log("Server ready!");
    })
    .catch((err) => {
        console.error(err);
    });