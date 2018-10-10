import Log from "../Util";
import {
    IInsightFacade,
    InsightDataset,
    InsightDatasetKind,
    InsightError,
    NodeType,
    NotFoundError
} from "./IInsightFacade";
import {ICourseSection, IDataSetEntry, IFullDataset, IRoom} from "../model/IFullDataset";
import * as JSZip from "jszip";
import * as fs from "fs";
import {QueryDeserializer} from "../deserializers/QueryDeserializer";
import {IQuery} from "../model/Query";
import {MemoryCache} from "./MemoryCache";
import {QueryPerformer} from "../service/QueryPerformer";

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
                        jsZip.loadAsync(content, {base64: true}).then(async function (zip) {
                            const courseDirectory: string = "campus/discover/buildings-and-classrooms/";
                            let index = jsZip.file("index.htm");
                            let buildings: string[];
                            await index.async("text").then((indexHTML) => {
                                // const root: AST.Default.Node = parse5.parse(indexHTML)
                                // as parse5.AST.Default.Document;
                                buildings = self.parseIndex(indexHTML);
                                // let table: Node = self.findBuildingTable(root);
                                // let table: any = self.findBuildingTable(root);
                                // Log.test(table.toString());
                            });
                            let files = Object.keys(zip.files).filter((directory) => directory.match(courseDirectory)
                                && buildings.includes(directory.replace(courseDirectory, "")));
                            if (files.length === 0) {
                                throw new InsightError("No files found in courses folder");
                            }
                            files.forEach(function (fileName) {
                                let promise: any = zip.files[fileName].async("text");
                                promises.push(promise);
                            });
                            Promise.all(promises).then((fileData) => {
                                Log.test("ROOMS");
                                self.parseBuildings(fileData, id);
                            }).catch(function (err) {
                                Log.test(err);
                                reject(err);
                                throw err;
                            });
                            // Log.test(html);
                        });
                }
        } catch (err) {
            throw err;
        }
    });
    }

    private parseBuildings(fileData: any[], id: string) {
        let rooms: IDataSetEntry[] = [];
        for (let file of fileData) {
            const root = parse5.parse(file) as parse5.AST.Default.Document;
            const table: any = this.findBuildingTable(root);
            let tBody: AST.Default.ParentNode;

            for (let child of table.childNodes) {
                if (child.nodeName === "tbody") {
                    tBody = child as AST.Default.ParentNode;
                }
            }

            const tableRows: any[] = tBody.childNodes.filter((child) => child.nodeName === "tr");

            for (let row of tableRows) {
                // let room: IDataSetEntry = this.parseRoom(row);
                this.parseRoom(row);
            }
        }
    }

    private parseRoom(roomData: any) {
        for (let cell of roomData) {
            Log.test(parse5.serialize(cell));
        }
    }

    private parseIndex(html: string) {
        const root: any = parse5.parse(html) as parse5.AST.Default.Document;
        const table: any = this.findBuildingTable(root);
        const buildingCodes = this.getBuildingCodes(table);
        return buildingCodes;
    }

    private getBuildingCodes(table: any) {
        let codes: string[] = [];
        let tBody: AST.Default.ParentNode;

        for (let child of table.childNodes) {
            if (child.nodeName === "tbody") {
                tBody = child as AST.Default.ParentNode;
            }
        }

        for (let c of tBody.childNodes) {
            if (c.nodeName === "tr") {
                const row: any = c;
                for (let cell of row.childNodes) {
                    if (cell.nodeName === "td") {
                        if (cell.attrs[0].value === "views-field views-field-field-building-code") {
                            let buildingCode: string = cell.childNodes[0].value.trim();
                            codes.push(buildingCode);
                        }
                    }
                }
            }
        }
        return codes;
    }

    private findBuildingTable(node: any) {
        if (!node) {
            return null;
        }

        let tableNode: any = null;
        let nodeType: string = node.nodeName;
        const childNodes: any[] = node.childNodes;

        if (!childNodes || childNodes.length === 0) {
            tableNode = nodeType === NodeType.Table ? node : null;
        } else {
            switch (nodeType) {
                case NodeType.Table:
                    tableNode =  node;
                    break;
                case NodeType.Document:
                case NodeType.HTML:
                case NodeType.Head:
                case NodeType.Body:
                case NodeType.Div:
                case NodeType.Section:
                    if (childNodes) {
                        for (let child of childNodes) {
                            tableNode = this.findBuildingTable(child) == null ?
                                tableNode : this.findBuildingTable(child);
                        }
                    }
                    break;
                default:
                    break;
            }
        }
        return tableNode;
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

                    let noNullProperties: boolean = Object.values(courseSection)
                        .every((property) => property != null);

                    if (noNullProperties) {
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
