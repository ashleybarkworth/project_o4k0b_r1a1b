import Log from "../Util";
import {
    IInsightFacade,
    InsightDataset,
    InsightDatasetKind,
    InsightError,
    NodeType,
    NotFoundError,
    RoomDescriptor
} from "./IInsightFacade";
import {ICourseSection, IDataSetEntry, IFullDataset, IRoom} from "../model/IFullDataset";
import * as JSZip from "jszip";
import * as fs from "fs";
import * as parse5 from "parse5";
import {QueryDeserializer} from "../deserializers/QueryDeserializer";
import {IQuery} from "../model/Query";
import {MemoryCache} from "./MemoryCache";

import {QueryPerformer} from "../service/QueryPerformer";
import {GeolocationFinder} from "../GeolocationFinder";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

const path = "./data/";

export default class InsightFacade implements IInsightFacade {
    private memoryCache: MemoryCache;

    constructor() {
        Log.trace("InsightFacadeImpl::init()");

        this.makeDataDirectoryIfNecessary();
        this.memoryCache = new MemoryCache();
    }

    // FOR TESTING ONLY!!!! DO NOT USE ME!
    public setMemoryCache(memoryCache: MemoryCache) {
        this.memoryCache = memoryCache;
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let promises: any[] = [];

        let self = this;
        return new Promise<string[]>((resolve, reject) => {
            try {
                this.validateAddDatasetInputs(id, kind);
                this.makeDataDirectoryIfNecessary();
                const jsZip = new JSZip();
                switch (kind) {
                    case "courses":
                        jsZip.loadAsync(content, {base64: true}).then(function (zip) {
                            const courseDirectory: string = "courses/.*";
                            let files = Object.keys(zip.files).filter((directory) => directory.match(courseDirectory));
                            if (files.length === 0) {
                                throw new InsightError("No files found in courses folder");
                            }
                            files.forEach(function (fileName) {
                                let promise: any = zip.files[fileName].async("text");
                                promises.push(promise);
                            });
                            Promise.all(promises).then((fileData) => {
                                let dataset: IFullDataset = self.addCourseSectionsToDataSet(id, fileData);
                                let datasetContent: string = JSON.stringify(dataset);
                                fs.writeFileSync(path + id + ".json", datasetContent);
                                resolve(self.memoryCache.getLoadedDataSets()
                                    .map((courseDataset: IFullDataset) => courseDataset.id));
                            }).catch(function (err) {
                                reject(new InsightError(err));
                            });
                        }).catch(function (err) {
                            reject(new InsightError(err));
                        });
                        break;
                    case "rooms":
                        self.parseBuildings(jsZip, content, id).then( () => {
                            resolve(self.memoryCache.getLoadedDataSets()
                                .map((courseDataset: IFullDataset) => courseDataset.id));
                        });
                }
        } catch (err) {
            throw err;
        }
    });
    }

    private parseBuildings(jsZip: any, content: string, id: string): Promise<IFullDataset> {
        let self = this;
        let promises: any[] = [];
        let rooms: IRoom[] = [];
        return new Promise<IFullDataset>((resolve, reject) => {
            jsZip.loadAsync(content, {base64: true}).then(async function (zip: any) {
                const courseDirectory: string = "campus/discover/buildings-and-classrooms/";
                let index = jsZip.file("index.htm");
                let buildingCodes: string[] = [];
                await index.async("text").then((indexHTML: any) => {
                    buildingCodes = self.parseIndex(indexHTML);
                });
                let files = Object.keys(zip.files).filter((directory) => directory.match(courseDirectory)
                    && buildingCodes.includes(directory.replace(courseDirectory, "")));
                if (files.length === 0) {
                    throw new InsightError("No files found in courses folder");
                }
                files.forEach(function (fileName) {
                    let promise: any = zip.files[fileName].async("text");
                    promises.push(promise);
                });

                let buildingPromises: any[] = [];
                Promise.all(promises).then((fileData) => {
                    for (let file of fileData) {
                        let buildingRooms = self.getAllRoomsFromBuilding(rooms, file);
                        buildingPromises.push(buildingRooms);
                    }

                    Promise.all(buildingPromises).then(() => {

                        if (rooms.length === 0) {
                            throw new InsightError("Dataset contains no valid rooms");
                        }
                        let dataset: IFullDataset = {
                            id,
                            kind: InsightDatasetKind.Rooms,
                            entries: rooms,
                        };

                        self.memoryCache.addLoadedDataSet(dataset);
                        let datasetContent: string = JSON.stringify(dataset);
                        fs.writeFileSync(path + id + ".json", datasetContent);
                        resolve(dataset);
                    });
                });

            }).catch (function (err: any) {
                reject(err);
                throw err;
            });
        });
    }

    private getAllRoomsFromBuilding(rooms: IRoom[], file: any): Promise<IRoom[]> {
        return new Promise<IRoom[]>((resolve, reject) => {
            const root = parse5.parse(file) as parse5.Document;
            const tBody: any = this.getTableBody(root, "views-table cols-5 table");

            let buildingInfo: any = this.getElementById(root, "building-info");

            if (buildingInfo) {
                let roomFullName: string = buildingInfo["childNodes"][1]["childNodes"][0]["childNodes"][0].value;
                let roomShortName: string = "";
                let address: string = buildingInfo["childNodes"][3]["childNodes"][0]["childNodes"][0].value;

                const latLonInfo = new GeolocationFinder();

                latLonInfo.getLatLonPair(address).then((info) => {
                    let lat: number = info.lat;
                    let lon: number = info.lon;
                    let tableRows: any[];
                    if (tBody) {
                        tableRows = this.getTableRows(tBody);
                    }

                    if (tableRows) {
                        for (let row of tableRows) {
                            let room: IRoom = this.parseRoom(row, roomFullName, roomShortName, address, lat, lon);
                            if (this.noNullProperties(room)) {
                                rooms.push(room);
                            }
                        }
                    }
                    resolve(rooms);
                }).catch((err: any) => {
                    reject(err);
                    throw err;
                });
            }
        });
    }

    private noNullProperties(entry: IDataSetEntry): boolean {
        return Object.values(entry).every((property) => property != null);
    }

    private parseRoom(roomData: any, fullName: string, shortName: string, address: string,
                      lat: number, lon: number): IRoom {

        let room: IRoom;
        let cells: any[] = roomData["childNodes"];
        cells = cells.filter((child) => child["nodeName"] === NodeType.Cell);

        const roomNumber: number = Number(this.getRoomFieldByDescriptor(cells, RoomDescriptor.Number));
        const capacity: string = this.getRoomFieldByDescriptor(cells, RoomDescriptor.Capacity);
        const furniture: string = this.getRoomFieldByDescriptor(cells, RoomDescriptor.Furniture);
        const type: string = this.getRoomFieldByDescriptor(cells, RoomDescriptor.Type);
        const href: string = this.getRoomFieldByDescriptor(cells, RoomDescriptor.Href);

        room = {
            fullname: fullName,
            shortname: shortName,
            number: roomNumber,
            name: shortName.concat("_", String(roomNumber)),
            address,
            lat,
            lon,
            seats: capacity,
            type,
            furniture,
            href,
        };
        return room;
    }

    private getRoomFieldByDescriptor(cells: any[], descriptor: RoomDescriptor): any {
        if (!cells) {
            return null;
        }

        let targetNode: any;
        for (let cell of cells) {
            let attributes: any[] = cell["attrs"];
            for (let attribute of attributes) {
                const classAttr = attribute["value"];
                if (classAttr === descriptor) {
                    targetNode = cell;
                }
            }
        }

        if (descriptor === RoomDescriptor.Number || descriptor === RoomDescriptor.Href) {
            let child: any = targetNode["childNodes"].filter((c: any) => c["nodeName"] === NodeType.Hyperlink)[0];
            let fieldValue: any;
            if (descriptor === RoomDescriptor.Href) {
                fieldValue = child["attrs"].filter((a: any) => a["name"] = "href")[0].value.trim();
            } else {
                fieldValue = child["childNodes"].filter((a: any) => a["nodeName"] = "#text")[0].value;
            }
            return fieldValue;
        } else if (descriptor === RoomDescriptor.Furniture || descriptor === RoomDescriptor.Capacity ||
            descriptor === RoomDescriptor.Type) {
            let child: any = targetNode["childNodes"].filter((c: any) => c["nodeName"] === NodeType.Text)[0];
            return child.value.trim();
        }

    }

    private parseIndex(html: string) {
        const document = parse5.parse(html);
        const tBody = this.getTableBody(document, "views-table cols-5 table");
        const buildingCodes = this.getBuildingCodes(tBody);
        return buildingCodes;
    }

    private getBuildingCodes(tBody: any) {
        let codes: string[] = [];

        if (!tBody) {
            throw new InsightError("Unexpected error - no body found in table");
        }

        const tableRows = this.getTableRows(tBody);

        if (tableRows) {
            for (let row of tableRows) {
                const tableCells = this.getRowCells(row);
                for (let cell of tableCells) {
                    if (cell["attrs"][0].value === "views-field views-field-field-building-code") {
                        let buildingCode: string = cell["childNodes"][0].value.trim();
                        codes.push(buildingCode);
                    }
                }
            }
        }
        return codes;
    }

    private getTableRows(tBody: any) {
        let children: any[] = tBody["childNodes"];

        if (children) {
            return children.filter((child) => child["nodeName"] === NodeType.Row);
        }
    }

    private getRowCells(row: any) {
        let children: any[] = row["childNodes"];

        if (children) {
            return children.filter((child) => child["nodeName"] === NodeType.Cell);
        }
    }

    private getTableBody(node: any, id: string): any {
        let element: any = null;

        if (!node) {
            return element;
        }

        let nodeType: NodeType = node.nodeName;
        const childNodes: any[] = node.childNodes;

        if (nodeType === NodeType.Table) {
            let nodeId: string;
            let nodeAttributes: any[] = node["attrs"];
            if (nodeAttributes && nodeAttributes[0] && nodeAttributes[0].value) {
                nodeId = nodeAttributes[0].value;
            }

            if (nodeId === id) {
                let tBody: any = node["childNodes"].filter((child: any) => child["nodeName"] === NodeType.TBody)[0];
                return tBody;
            }
        } else {
            if (childNodes && childNodes.length > 0) {
                for (let child of childNodes) {
                    if (this.getTableBody(child, id)) {
                        return this.getTableBody(child, id);
                    }
                }
            }
        }

        return element;
    }

    private getElementById(node: any, id: string): any {
        let element: any = null;

        if (!node) {
            return element;
        }

        let nodeId: string = "";
        let nodeAttributes: any[] = node["attrs"];
        if (nodeAttributes && nodeAttributes[0] && nodeAttributes[0].value) {
            nodeId = nodeAttributes[0].value;
        }

        const childNodes: any[] = node["childNodes"];

        if (nodeId === id) {
            return node;
        } else {
            if (childNodes && childNodes.length > 0) {
                for (let child of childNodes) {
                    if (this.getElementById(child, id)) {
                        return this.getElementById(child, id);
                    }
                }
            }
        }
        return element;
    }

    private validateAddDatasetInputs(id: string, kind: InsightDatasetKind) {
        if (kind !==  InsightDatasetKind.Courses && kind !== InsightDatasetKind.Rooms) {
            throw new InsightError("Invalid dataset kind");
        }
        if (!id || id.length === 0) {
            throw new InsightError("Dataset id is null, undefined or empty");
        }
        if (this.fileExists(id)) {
            throw new InsightError("Dataset with this id already exists");
        }
    }

    private makeDataDirectoryIfNecessary() {
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path);
        }
    }

    public removeDataset(id: string): Promise<string> {
        let self = this;
        return new Promise<string>(function (resolve, reject) {
            if (id == null) {
                let err = new InsightError("Null or undefined id");
                reject(err);
                return;
            }

            self.memoryCache.removeDataSet(id);

            try {
                if (fs.existsSync(path + id + ".json")) {
                    fs.unlinkSync(path + id + ".json");
                    resolve(id);
                } else {
                    reject(new NotFoundError("No dataset with that id added yet"));
                }
            } catch (err) {
                reject(new InsightError(err));
            }
        });
    }

    public performQuery(query: any): Promise<any[]> {
        return new Promise<any[]>((resolve, reject) => {
                try {
                    let iquery: IQuery = new QueryDeserializer().deserialize(query);
                    let datasetToQuery = this.getDataSetToQuery(iquery.options.key);
                    let result: any[] = new QueryPerformer().performQuery(iquery, datasetToQuery);
                    resolve(result);
                } catch (err) {
                    reject(new InsightError(err));
                }
            }
        );
    }

    /**
     * Parses file content from the zip into valid course sections, then creates and returns a
     * new dataset with these course sections and the given ID. Any invalid course sections or invalid course files
     * (e.g., files containing invalid JSON) are ignored. A valid dataset must contain at least one valid
     * course section, or an InsightError is thrown.
     *
     * In order for a course section to be valid, it must:
     *  1. Contain all of the following keys: Course, Subject, Avg, Professor, Title, Pass, Fail, Audit, id, Year
     *  2. Key value types must match the type in the corresponding ICourseSection field (with the exception of
     *  Year and id)
     *
     * @param id        the id of the dataset we are adding, e.g. 'courses'
     * @param fileData  the file content
     * @return          the added dataset
     * @throws          InsightError if the dataset contains no valid course sections
     */
    private addCourseSectionsToDataSet(id: string, fileData: any): IFullDataset {
        let courseSections: ICourseSection[] = [];
        for (let i = 1; i < fileData.length; i++) {
            let parsedJSON: any;
            try {
                parsedJSON = JSON.parse(fileData[i]);
            } catch (err) {
                continue;
            }
            for (const c of parsedJSON.result) {
                try {
                    const courseId: string = typeof c.Course === "string" ? c.Course : undefined;
                    const dept: string = typeof c.Subject === "string" ? c.Subject : undefined;
                    const avg: number = typeof c.Avg === "number" ? c.Avg : undefined;
                    const instructor: string = typeof c.Professor === "string"
                        ? c.Professor : undefined;
                    const title: string = typeof c.Title === "string" ? c.Title : undefined;
                    const pass: number = typeof c.Pass === "number" ? c.Pass : undefined;
                    const fail: number = typeof c.Fail === "number" ? c.Fail : undefined;
                    const audit: number = typeof c.Audit === "number" ? c.Audit : undefined;
                    const uuid: string = typeof c.id === "number" ? String(c.id) : undefined;
                    const year: number = typeof c.Year === "string" ? Number(c.Year) : undefined;

                    const courseSection: ICourseSection = {
                        id: courseId,
                        dept,
                        avg,
                        instructor,
                        title,
                        pass,
                        fail,
                        audit,
                        uuid,
                        year
                    };

                    if (this.noNullProperties(courseSection)) {
                        courseSections.push(courseSection);
                    }
                } catch (err) { // continue to next course section if any errors occur
                    continue;
                }

            }
        }

        if (courseSections.length === 0) {
            throw new InsightError("Dataset contains no valid course sections");
        } else {
            let dataset: IFullDataset = {id, kind: InsightDatasetKind.Courses, entries: courseSections};
            this.memoryCache.addLoadedDataSet(dataset);
            return dataset;
        }
    }

    private fileExists(id: string) {
        return fs.existsSync(path + id + ".json");
    }

    private loadAllDatasetsFromDisk() {
        if (fs.existsSync(path)) {
            let files = fs.readdirSync(path);
            files.map((file) => file.replace(".json", ""))
                .forEach((filename) => this.loadDataSetFromDisk(filename));
        }
    }

    private loadDataSetFromDisk(id: string) {
        if (!this.memoryCache.containsId(id) && this.fileExists(id)) {
            Log.info("Found file on disk but not in memory; loading now");
            let data = fs.readFileSync(path + id + ".json", "utf8");
            let dataset: IFullDataset = JSON.parse(data);
            this.memoryCache.addLoadedDataSet(dataset);
        }
    }

    private getDataSetToQuery(key: string) {
        if (!this.memoryCache.containsId(key)) {
            this.loadDataSetFromDisk(key);
        }
        let datasetToQuery: IFullDataset = this.memoryCache.getByKey(key);
        if (datasetToQuery === undefined) {
            throw new InsightError("Couldn't find a dataset with that id");
        }
        return datasetToQuery;
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return new Promise<InsightDataset[]>((resolve, reject) => {
            try {
                this.loadAllDatasetsFromDisk();
                resolve(this.memoryCache.getLoadedDataSets().map((ds) => {
                    return {
                        id: ds.id,
                        kind: InsightDatasetKind.Courses,
                        numRows: ds.entries.length,
                    }  as
                        InsightDataset;
                }));
            } catch (err) {
                reject(new InsightError(err));
            }
        });
    }
}
