import { expect } from "chai";
import {FilterDeserializer} from "../src/FilterDeserializer";
import {AndComparison, GtComparator, IFilter} from "../src/model/Filter.js.js";

describe ("Simple deserialize tests", () => {
    it("Should deserialize a simple GT query", () => {
       let query: any = {
           GT: {
               courses_avg: 40
           }
       };
       let filterDeserializer: FilterDeserializer = new FilterDeserializer();
       let filter: IFilter = filterDeserializer.deserialize(query);
       // TODO  update
       expect(filter.validCourseSection(null)).to.be.eq(true);
       expect(filter).to.be.instanceOf(GtComparator);
    });
    it("Should deserialize a simple AND query", () => {
        let query: any = {
            AND: [
                {
                    LT: {
                        courses_avg: 60
                    }
                },
                {
                    NOT: {
                        EQ: {
                            courses_avg: 0
                        }
                    }
                }
            ]
        };
        let filterDeserializer: FilterDeserializer = new FilterDeserializer();
        let filter: IFilter = filterDeserializer.deserialize(query);
        // TODO update
        expect(filter).to.be.instanceOf(AndComparison);
        expect(filter.validCourseSection(null)).to.be.eq(true);
    });
});
