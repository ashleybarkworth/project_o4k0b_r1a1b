import Server from "../src/rest/Server";

import InsightFacade from "../src/controller/InsightFacade";
import chai = require("chai");

import chaiHttp = require("chai-http");
import Log from "../src/Util";
import * as fs from "fs";

const datasetPath = "./test/data/";
const queryPath = "./test/serverQueries";
describe("Facade D3", function () {

    let facade: InsightFacade = null;
    let server: Server = null;

    chai.use(chaiHttp);

    before(function () {
        facade = new InsightFacade();
        server = new Server(4321);
        server.start().then(function (val: boolean) {
            Log.info("Server successfully started");
        }).catch(function (err: Error) {
            Log.error("Server::before() - ERROR: " + err.message);
        });
    });

    after(function () {
        Log.test(`All tests executed: stopping server now`);
        server.stop();
    });

    beforeEach(function () {
        // might want to add some process logging here to keep track of what"s going on
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    afterEach(function () {
        // might want to add some process logging here to keep track of what"s going on
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Hint on how to test PUT requests

    it("POST query before PUT", function () {
        try {
            let query = fs.readFileSync(queryPath + "/queryOne.json").toString();
            Log.test("Test PUT courses dataset");
            return chai.request("http://localhost:4321")
                .post("/query")
                .send(query)
                .then(function (res: ChaiHttp.Response) {
                    Log.test(`PUT request unexpectedly returned status  ${res.status}`);
                    chai.expect.fail();
                })
                .catch(function (res: ChaiHttp.Response) {
                    chai.expect(res.status).to.be.equal(400);
                });
        } catch (err) {
            Log.test(`${err} occurred during PUT request`);
        }
    });

    it("PUT test for courses dataset", function () {
        try {
            let dataset = "courses.zip";
            Log.test("Test PUT courses dataset");
            return chai.request("http://localhost:4321")
                .put("/dataset/courses/courses")
                .attach("body", fs.readFileSync(datasetPath + dataset), dataset)
                .then(function (res: ChaiHttp.Response) {
                    chai.expect(res.status).to.be.equal(200);
                    chai.expect(res.body.datasets).to.deep.include("courses");
                })
                .catch(function (err: any) {
                    Log.test(err);
                    chai.expect.fail();
                });
        } catch (err) {
            Log.test(`${err} occurred during PUT request`);
        }
    });

    it("PUT test for rooms dataset", function () {
        try {
            let dataset = "rooms.zip";
            Log.test("Test PUT courses dataset");
            return chai.request("http://localhost:4321")
                .put("/dataset/rooms/rooms")
                .attach("body", fs.readFileSync(datasetPath + dataset), dataset)
                .then(function (res: ChaiHttp.Response) {
                    chai.expect(res.status).to.be.equal(200);
                    chai.expect(res.body.datasets).to.have.deep.members(["courses", "rooms"]);
                })
                .catch(function (err: any) {
                    Log.test(err);
                    chai.expect.fail();
                });
        } catch (err) {
            Log.test(`${err} occurred during PUT request`);
        }
    });

    it("PUT test for dataset that's already been added", function () {
        try {
            let dataset = "courses.zip";
            Log.test("Test PUT courses dataset");
            return chai.request("http://localhost:4321")
                .put("/dataset/courses/courses")
                .attach("body", fs.readFileSync(datasetPath + dataset), dataset)
                .then(function (res: ChaiHttp.Response) {
                    chai.expect.fail();
                })
                .catch(function (res: ChaiHttp.Response) {
                    chai.expect(res.status).to.be.equal(400);
                });
        } catch (err) {
            Log.test(`${err} occurred during PUT request`);
        }
    });

    it("PUT test for invalid dataset kind", function () {
        try {
            let dataset = "rooms.zip";
            Log.test("Test PUT courses dataset");
            return chai.request("http://localhost:4321")
                .put("/dataset/courses/professors")
                .attach("body", fs.readFileSync(datasetPath + dataset), dataset)
                .then(function (res: ChaiHttp.Response) {
                    chai.expect.fail();
                })
                .catch(function (res: ChaiHttp.Response) {
                   chai.expect(res.status).to.equal(400);
                });
        } catch (err) {
            Log.test(`${err} occurred during PUT request`);
        }
    });

    it("DELETE test for courses dataset", function () {
        try {
            Log.test("Test DELETE courses dataset");
            return chai.request("http://localhost:4321")
                .del("/dataset/courses")
                .then(function (res: ChaiHttp.Response) {
                    chai.expect(res.status).to.be.equal(200);
                    chai.expect(res.body).to.deep.include("courses");
                })
                .catch(function (err: any) {
                    Log.test(err);
                    chai.expect.fail();
                });
        } catch (err) {
            Log.test(`${err} occurred during DELETE request`);
        }
    });

    it("DELETE test for dataset that hasn't been added", function () {
        try {
            return chai.request("http://localhost:4321")
                .del("/dataset/professors")
                .then(function (res: ChaiHttp.Response) {
                    chai.expect.fail();
                })
                .catch(function (res: ChaiHttp.Response) {
                    chai.expect(res.status).to.be.equal(404);
                });
        } catch (err) {
            Log.test(`${err} occurred during DELETE request`);
        }
    });

    it("POST test for simple query", function () {
        try {
            Log.test("Test POST query");
            const query = fs.readFileSync(queryPath + "/queryOne.json").toString();
            return chai.request("http://localhost:4321")
                .post("/query")
                .send(query)
                .then(function (res: ChaiHttp.Response) {
                    chai.expect(res.status).to.be.equal(200);
                    chai.expect(res.body.entries).to.be.an.instanceOf(Array);
                    chai.expect(res.body.entries).to.have.length(3);
                })
                .catch(function (err: any) {
                    Log.test(err);
                    chai.expect.fail();
                });
        } catch (err) {
            Log.test(`${err} occurred during POST request`);
        }
    });

    it("POST test for invalid query", function () {
        try {
            Log.test("Test POST query");
            const query = fs.readFileSync(queryPath + "/invalidQuery.json").toString();
            return chai.request("http://localhost:4321")
                .post("/query")
                .send(query)
                .then(function (res: ChaiHttp.Response) {
                    chai.expect.fail();
                })
                .catch(function (res: ChaiHttp.Response) {
                    chai.expect(res.status).to.be.equal(400);
                });
        } catch (err) {
            Log.test(`${err} occurred during POST request`);
        }
    });

    it("GET datasets", function () {
        try {
            Log.test("Test GET datasets");
            return chai.request("http://localhost:4321")
                .get("/datasets")
                .then(function (res: ChaiHttp.Response) {
                    chai.expect(res.status).to.be.equal(200);
                    chai.expect(res.body).to.be.an.instanceOf(Array);
                    chai.expect(res.body).to.be.length(1);
                })
                .catch(function (res: ChaiHttp.Response) {
                    chai.expect.fail();
                });
        } catch (err) {
            Log.test(`${err} occurred during GET request`);
        }
    });

});
