import Server from "../src/rest/Server";

import InsightFacade from "../src/controller/InsightFacade";
import chai = require("chai");

import chaiHttp = require("chai-http");
import Log from "../src/Util";
import * as fs from "fs";

const datasetPath = "./test/data/";
describe("Facade D3", function () {

    let facade: InsightFacade = null;
    let server: Server = null;

    chai.use(chaiHttp);

    before(function () {
        facade = new InsightFacade();
        server = new Server(4321);
        // TODO: start server here once and handle errors properly
        server.start().then(function (val: boolean) {
            Log.info("Server successfully started");
        }).catch(function (err: Error) {
            Log.error("Server::before() - ERROR: " + err.message);
        });
    });

    after(function () {
        // TODO: stop server here once!
        server.stop();
    });

    beforeEach(function () {
        // might want to add some process logging here to keep track of what"s going on
    });

    afterEach(function () {
        // might want to add some process logging here to keep track of what"s going on
    });

    // TODO: read your courses and rooms datasets here once!

    // Hint on how to test PUT requests

    it("PUT test for courses dataset", function () {
        try {
            let dataset = "courses.zip";
            Log.test("Test PUT courses dataset");
            return chai.request("http://localhost:4321")
                .put("/dataset/courses/courses")
                .attach("body", fs.readFileSync(datasetPath + dataset), dataset)
                .then(function (res: ChaiHttp.Response) {
                    chai.expect(res.status).to.be.equal(200);
                })
                .catch(function (err: any) {
                    // some logging here please!
                    Log.test(err);
                    chai.expect.fail();
                });
        } catch (err) {
            // and some more logging here!
        }
    });

    it("DELETE test for dataset ", function () {
        try {
            Log.test("Test DELETE courses dataset");
            return chai.request("http://localhost:4321")
                .del("/dataset/courses")
                .then(function (res: ChaiHttp.Response) {
                    chai.expect(res.status).to.be.equal(200);
                })
                .catch(function (err: any) {
                    // some logging here please!
                    Log.test(err);
                    chai.expect.fail();
                });
        } catch (err) {
            // and some more logging here!
        }
    });

    it("DELETE test for courses dataset", function () {
        try {
            Log.test("Test DELETE courses dataset");
            return chai.request("http://localhost:4321")
                .del("/dataset/courses")
                .then(function (res: ChaiHttp.Response) {
                    chai.expect(res.status).to.be.equal(200);
                })
                .catch(function (err: any) {
                    // some logging here please!
                    Log.test(err);
                    chai.expect.fail();
                });
        } catch (err) {
            // and some more logging here!
        }
    });

    // The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});
