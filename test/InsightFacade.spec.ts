import {expect} from "chai";

import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";
import {MemoryCache} from "../src/controller/MemoryCache";
import * as fs from "fs";

// This should match the JSON schema described in test/query.schema.json
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any;  // make any to allow testing structurally invalid queries
    isQueryValid: boolean;
    result: string | string[];
    filename: string;  // This is injected when reading the file
}

const dataDirectoryPath = "./data/";

describe("InsightFacade Add/Remove Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the Before All hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        courses2: "./test/data/courses2.zip",
        coursesJPEG: "./test/data/coursesJPEG.zip",
        notCoursesFolder: "./test/data/notCoursesFolder.zip",
        oneCourseContainsInvalidJSON: "./test/data/oneCourseContainsInvalidJSON.zip",
        oneCourseHasNoValidSections: "./test/data/oneCourseHasNoValidSections.zip",
        rooms: "./test/data/rooms.zip",
        someCoursesWithInvalidSections: "./test/data/someCoursesWithInvalidSections.zip",
        zeroValidCourseSections: "./test/data/zeroValidCourseSections.zip",
        yaml: "./test/data/yaml.zip",
        oneValidOneInvalidDueToTypeMismatch: "./test/data/oneValidOneInvalidDueToTypeMismatch.zip",
        roomsWithUnlinkedBuilding: "./test/data/roomsWithUnlinkedBuilding.zip",
    };

    let insightFacade: InsightFacade;
    let datasets: { [id: string]: string };

    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);

        try {
            const loadDatasetPromises: Array<Promise<Buffer>> = [];
            for (const [id, path] of Object.entries(datasetsToLoad)) {
                loadDatasetPromises.push(TestUtil.readFileAsync(path));
            }
            const loadedDatasets = (await Promise.all(loadDatasetPromises)).map((buf, i) => {
                return {[Object.keys(datasetsToLoad)[i]]: buf.toString("base64")};
            });
            datasets = Object.assign({}, ...loadedDatasets);
            expect(Object.keys(datasets)).to.have.length.greaterThan(0);
        } catch (err) {
            expect.fail("", "", `Failed to read one or more datasets. ${JSON.stringify(err)}`);
        }

        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(insightFacade).to.be.instanceOf(InsightFacade);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });
    it("Should list no datasets if none have been added", async () => {
        let response: InsightDataset[];
        try {
            response = await insightFacade.listDatasets();
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.have.length(0);
        }
    });

    it("Should add a valid dataset", async () => {
        const id: string = "courses";
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.include.deep.members(["courses"]);
            expect(fs.existsSync(dataDirectoryPath + id + ".json")).to.eq(true);
        }
    });

    it("Should list one dataset if only one has been added", async () => {
        let response: InsightDataset[];
        try {
            response = await insightFacade.listDatasets();
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.have.length(1);
            expect(response).to.have.property("0").to.have.property("id").that.deep.equals( "courses");
        }
    });

    it("Should add a valid rooms dataset", async () => {
        const id: string = "rooms";
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.include.deep.members(["courses", "rooms"]);
            expect(fs.existsSync(dataDirectoryPath + id + ".json")).to.eq(true);
        }
    });

    it("Should list multiple datasets if more than one has been added", async () => {
        let response: InsightDataset[];
        try {
            response = await insightFacade.listDatasets();
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.have.length(2);
            expect(response).to.have.property("0").to.have.property("id").that.deep.equals( "courses");
            expect(response).to.have.property("1").to.have.property("id").that.deep.equals( "rooms");
        }
    });

    it("Should add a valid rooms dataset with an unlinked building", async () => {
        const id: string = "roomsWithUnlinkedBuilding";
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.have.deep.members(["courses", "rooms", "roomsWithUnlinkedBuilding"]);
            expect(fs.existsSync(dataDirectoryPath + id + ".json")).to.eq(true);
        }
    });

    it("Should add a dataset with courses that have valid&invalid sections", async () => {
        const id: string = "someCoursesWithInvalidSections";
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.include.deep.members(["courses", "rooms", "someCoursesWithInvalidSections"]);
            expect(fs.existsSync(dataDirectoryPath + id + ".json")).to.eq(true);
        }

    });

    it("Should add a dataset with one course that has zero valid course sections", async () => {
        const id: string = "oneCourseHasNoValidSections";
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.include.deep.members(["courses", "rooms", "someCoursesWithInvalidSections",
            "oneCourseHasNoValidSections"]);
            expect(fs.existsSync(dataDirectoryPath + id + ".json")).to.eq(true);
        }

    });

    it("Should add a dataset with one course that contains invalid JSON", async () => {
        const id: string = "oneCourseContainsInvalidJSON";
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.include.deep.members(["courses", "rooms", "someCoursesWithInvalidSections",
                "oneCourseHasNoValidSections", "oneCourseContainsInvalidJSON"]);
            expect(fs.existsSync(dataDirectoryPath + id + ".json")).to.eq(true);
        }

    });

    it("One section invalid due to type mismatch, other is valid", async () => {
        const id: string = "oneValidOneInvalidDueToTypeMismatch";
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.include.deep.members(["courses", "rooms", "someCoursesWithInvalidSections",
                "oneCourseHasNoValidSections", "oneCourseContainsInvalidJSON", "oneValidOneInvalidDueToTypeMismatch"]);
            expect(fs.existsSync(dataDirectoryPath + id + ".json")).to.eq(true);
        }

    });

    it("Should throw an InsightError when adding a dataset with no json files", async () => {
        const id: string = "coursesJPEG";
        let response: any[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.a.instanceOf(InsightError);
        }
    });

    it("Should throw an InsightError when adding a dataset with an existing id", async () => {
        const id: string = "courses";
        let response: any[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.a.instanceOf(InsightError);
        }
    });

    it("Should throw an InsightError when adding a dataset that's not a ZIP file", async () => {
        const id: string = "testFile";
        let response: any[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.a.instanceOf(InsightError);
        }
    });

    it("Should reject a yaml course", async () => {
        const id: string = "yaml";
        let response: string[];
        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });

    it("Should throw an InsightError when adding a dataset not under /courses", async () => {
        const id: string = "notCoursesFolder";
        let response: any[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.a.instanceOf(InsightError);
        }
    });

    it("Should throw an InsightError when adding a dataset with zero valid course sections", async () => {
        const id: string = "zeroValidCourseSections";
        let response: any[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.a.instanceOf(InsightError);
        }
    });

    it("Should throw an InsightError when adding a dataset that does not exist", async () => {
        const id: string = "professors";
        let response: any[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.a.instanceOf(InsightError);
        }
    });

    it("Should throw an InsightError when adding a dataset that contains no JSON files", async () => {
        const id: string = "coursesAllImages";
        let response: any[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.a.instanceOf(InsightError);
        }
    });

    it("Should throw an InsightError when adding a dataset with a null kind", async () => {
        const id: string = "courses";
        let response: any[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], null);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.a.instanceOf(InsightError);
        }
    });

    it("Should throw an InsightError when adding a dataset with an undefined kind", async () => {
        const id: string = "courses";
        let response: any[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], undefined);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.a.instanceOf(InsightError);
        }
    });

    it("Should throw an InsightError when adding a dataset with an empty id", async () => {
        let response: any[];
        const id: string = "";

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.a.instanceOf(InsightError);
        }
    });

    it("Should throw an InsightError when adding a dataset with a null id", async () => {
        let response: any[];
        const id: string = null;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.a.instanceOf(InsightError);
        }
    });

    it("Should throw an InsightError when adding a dataset with an undefined id", async () => {
        let response: any[];
        const id: string = undefined;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.a.instanceOf(InsightError);
        }
    });

    it("Should throw an InsightError when adding a dataset with null content", async () => {
        let response: any[];
        const id: string = "nullDataset";

        try {
            response = await insightFacade.addDataset(id, null, InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.a.instanceOf(InsightError);
        }
    });

    it("Should throw an InsightError when adding a dataset with undefined content", async () => {
        let response: any[];
        const id: string = "undefinedDataset";

        try {
            response = await insightFacade.addDataset(id, undefined, InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.a.instanceOf(InsightError);
        }
    });

    it("Should throw an InsightError when adding null", async () => {
        let response: any[];
        const id: string = null;

        try {
            response = await insightFacade.addDataset(id, id, InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.a.instanceOf(InsightError);
        }
    });

    it("Should throw an InsightError when adding undefined", async () => {
        let response: any[];
        const id: string = undefined;

        try {
            response = await insightFacade.addDataset(id, id, InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.a.instanceOf(InsightError);
        }
    });

    it("Should throw an InsightError when adding an empty dataset", async () => {
        let response: any[];
        const id: string = "emptyZIPFile";

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.a.instanceOf(InsightError);
        }
    });

    // This is an example of a pending test. Add a callback function to make the test run.
    it("Should remove a valid dataset", async () => {
        const id: string = "courses";
        let response: string;

        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.deep.equal(id);
            expect(fs.existsSync(dataDirectoryPath + id + ".json")).to.eq(false);
        }
    });

    it("Should throw a NotFoundError when removing a dataset that does not exist", async () => {
        const id: string = "professors";
        let response: any;

        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            Log.warn("We got an error");
            response = err;
        } finally {
            expect(response).to.be.instanceOf(NotFoundError);
        }
    });

    it("Should throw an InsightError when removing a dataset with a null id", async () => {
        const id: string = null;
        let response: any;

        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            Log.error("We got an error");
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });

    it("Should throw an InsightError when removing a dataset with an undefined id", async () => {
        const id: string = undefined;
        let response: any;

        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
});

// This test suite dynamically generates tests from the JSON files in test/queries.
// You should not need to modify it; instead, add additional files to the queries directory.
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
    };
    let insightFacade: InsightFacade;
    let testQueries: ITestQuery[] = [];

    // Create a new instance of InsightFacade, read in the test queries from test/queries and
    // add the datasets specified in datasetsToQuery.
    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = await TestUtil.readTestQueries();
            expect(testQueries).to.have.length.greaterThan(0);
        } catch (err) {
            expect.fail("", "", `Failed to read one or more test queries. ${JSON.stringify(err)}`);
        }

        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(insightFacade).to.be.instanceOf(InsightFacade);
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Fail if there is a problem reading ANY dataset.
        try {
            const loadDatasetPromises: Array<Promise<Buffer>> = [];
            for (const [id, path] of Object.entries(datasetsToQuery)) {
                loadDatasetPromises.push(TestUtil.readFileAsync(path));
            }
            const loadedDatasets = (await Promise.all(loadDatasetPromises)).map((buf, i) => {
                return {[Object.keys(datasetsToQuery)[i]]: buf.toString("base64")};
            });
            expect(loadedDatasets).to.have.length.greaterThan(0);

            const responsePromises: Array<Promise<string[]>> = [];
            const datasets: { [id: string]: string } = Object.assign({}, ...loadedDatasets);
            for (const [id, content] of Object.entries(datasets)) {
                responsePromises.push(insightFacade.addDataset(id, content, InsightDatasetKind.Courses));
            }

            // This try/catch is a hack to let your dynamic tests execute even if the addDataset method fails.
            // In D1, you should remove this try/catch to ensure your datasets load successfully before trying
            // to run you queries.
            try {
                const responses: string[][] = await Promise.all(responsePromises);
                responses.forEach((response) => expect(response).to.be.an("array"));
            } catch (err) {
                Log.warn(`Ignoring addDataset errors. For D1, you should allow errors to fail the Before All hook.`);
            }
        } catch (err) {
            expect.fail("", "", `Failed to read one or more datasets. ${JSON.stringify(err)}`);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries
    it("Should run test queries", function () {
        describe("Dynamic InsightFacade PerformQuery tests", function () {
            for (const test of testQueries) {
                // if (test.filename === "test/queries/sumOnString.json") {
                    it(`[${test.filename}] ${test.title}`, async function () {
                        let response;

                        try {
                            response = await insightFacade.performQuery(test.query);
                        } catch (err) {
                            response = err;
                        } finally {
                            if (test.filename === "test/queries/ahReallySlow.json") {
                                expect(response).to.have.length(4513);
                            } else if (test.isQueryValid && shouldBeOrdered(test)) {
                                expect(response).to.deep.equal(test.result);
                            } else if (test.isQueryValid) {
                                expect(response).to.have.deep.members(test.result as any[]);
                            } else {
                                Log.error(test.filename + ": " + (response as Error).message);
                                expect(response).to.be.instanceOf(InsightError);
                            }
                        }
                    });
                }
            // }
        });
    });
});

describe("Tests that require mucking around with the state", () => {
    let insightFacade = new InsightFacade();
    let memoryCache = new MemoryCache(); // Lets us test some edge cases to create this separately
    insightFacade.setMemoryCache(memoryCache);

    it("Test loading from disk for a query", async function () {
        let resp = await
            insightFacade.performQuery({WHERE: {LT: {courses_avg: 1}}, OPTIONS: {COLUMNS: ["courses_dept"]}});
        expect(resp).does.not.have.length(0);
    });

    it("List datasets load from disk", async function () {
        memoryCache.removeDataSet("courses");
        let result: InsightDataset[] = await insightFacade.listDatasets();
        expect(result).not.to.have.length(0);
    });
});

function shouldBeOrdered(testQuery: ITestQuery): boolean {
    return (testQuery.query.hasOwnProperty("OPTIONS") && testQuery.query["OPTIONS"].hasOwnProperty("ORDER"));
}
