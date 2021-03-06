/**
 * Created by rtholmes on 2016-06-19.
 */

import fs = require("fs");
import restify = require("restify");
import Log from "../Util";
import InsightFacade from "../controller/InsightFacade";
import {InsightDataset, NotFoundError} from "../controller/IInsightFacade";

/**
 * This configures the REST endpoints for the server.
 */
export default class Server {

    private port: number;
    private rest: restify.Server;

    constructor(port: number) {
        Log.info("Server::<init>( " + port + " )");
        this.port = port;
    }

    /**
     * Stops the server. Again returns a promise so we know when the connections have
     * actually been fully closed and the port has been released.
     *
     * @returns {Promise<boolean>}
     */
    public stop(): Promise<boolean> {
        Log.info("Server::close()");
        const that = this;
        return new Promise(function (fulfill) {
            that.rest.close(function () {
                fulfill(true);
            });
        });
    }

    /**
     * Starts the server. Returns a promise with a boolean value. Promises are used
     * here because starting the server takes some time and we want to know when it
     * is done (and if it worked).
     *
     * @returns {Promise<boolean>}
     */
    public start(): Promise<boolean> {
        const that = this;
        return new Promise(function (fulfill, reject) {
            let insightFacade = new InsightFacade();

            try {
                Log.info("Server::start() - start");

                that.rest = restify.createServer({
                    name: "insightUBC",
                });
                that.rest.use(restify.bodyParser({mapFiles: true, mapParams: true}));
                that.rest.use(
                    function crossOrigin(req, res, next) {
                        res.header("Access-Control-Allow-Origin", "*");
                        res.header("Access-Control-Allow-Headers", "X-Requested-With");
                        return next();
                    });

                // NOTE: your endpoints should go here
                that.rest.put("/dataset/:id/:kind", (req: restify.Request,
                                                     res: restify.Response, next: restify.Next) => {
                    const dataset = req.params.body.toString("base64");
                    const id  = req.params.id;
                    const kind = req.params.kind;
                    insightFacade.addDataset(id, dataset, kind).then((result: string[]) => {
                        res.json(200, {result});
                    }).catch((err) => {
                        Log.error(err);
                        reject(err);
                        res.json(400, {
                            error: `Error adding dataset with id = ${req.params.id}.`,
                        });
                    });

                    return next();
                });

                that.rest.del("/dataset/:id", (req: restify.Request,
                                               res: restify.Response, next: restify.Next) => {
                    const id = req.params.id;
                    insightFacade.removeDataset(id).then((result: string) => {
                        res.json(200, {result});
                    }).catch(function (err) {
                        if (err instanceof NotFoundError) {
                            res.json(404, {
                                error: `Could not find dataset with id = ${req.params.id} to remove`,
                            });
                        } else {
                            reject(err);
                            res.json(400, {
                                error: `Error occurred while removing dataset with id = ${req.params.id}.`,
                            });
                        }
                    });
                    return next();
                });

                that.rest.post("/query", (req: restify.Request,
                                          res: restify.Response, next: restify.Next) => {
                    insightFacade.performQuery(req.body).then((result: any[]) => {
                        res.json(200, {result});
                    }).catch((err) => {
                        Log.error(err);
                        reject(err);
                        res.json(400, {
                            error: `Error occurred while executing query`,
                        });
                    });
                    return next();
                });

                that.rest.get("/datasets", (req: restify.Request,
                                            res: restify.Response, next: restify.Next) => {
                    insightFacade.listDatasets().then((result: InsightDataset[]) => {
                        res.json(200, {result});
                    }).catch((err) => {
                        reject(err);
                        res.json(400, {
                            error: `Error occurred while retrieving datasets`,
                        });
                    });
                    return next();
                });

                // This must be the last endpoint!
                that.rest.get("/.*", Server.getStatic);

                that.rest.listen(that.port, function () {
                    Log.info("Server::start() - restify listening: " + that.rest.url);
                    fulfill(true);
                });

                that.rest.on("error", function (err: string) {
                    // catches errors in restify start; unusual syntax due to internal
                    // node not using normal exceptions here
                    Log.info("Server::start() - restify ERROR: " + err);
                    reject(err);
                });

            } catch (err) {
                Log.error("Server::start() - ERROR: " + err);
                reject(err);
            }
        });
    }

    private static getStatic(req: restify.Request, res: restify.Response, next: restify.Next) {
        const publicDir = "frontend/public/";
        Log.trace("RoutHandler::getStatic::" + req.url);
        let path = publicDir + "index.html";
        if (req.url !== "/") {
            path = publicDir + req.url.split("/").pop();
        }
        fs.readFile(path, function (err: Error, file: Buffer) {
            if (err) {
                res.send(500);
                Log.error(JSON.stringify(err));
                return next();
            }
            res.write(file);
            res.end();
            return next();
        });
    }

}
