import {expect} from "chai";

import {QueryPerformer} from "../src/service/QueryPerformer";

describe("Test group by", function () {

    it("Test simple group by", function () {
        let objA = {
            name: "George",
            age: 20
        };
        let objB = {
            name: "Emmy",
            age: 23
        };
        let objC = {
            name: "Louis",
            age: 20
        };
        let objD = {
            name: "Adam",
            age: 23
        };
        let result: any[][] = QueryPerformer.groupBy([objA, objB, objC, objD], ["age"]);
        expect(result).to.have.length(2);
        expect(result).to.deep.include([{name: "George", age: 20}, {name: "Louis", age: 20}]);
        expect(result).to.deep.include([{name: "Emmy", age: 23}, {name: "Adam", age: 23}]);
    });

    it("Test grouping by two keys", function () {
        let george = {
            name: "George",
            age: 20,
            pet: "dog"
        };
        let emmy = {
            name: "Emmy",
            age: 23,
            pet: "dog"
        };
        let louis = {
            name: "Louis",
            age: 20,
            pet: "cat"
        };
        let adam = {
            name: "Adam",
            age: 23,
            pet: "cat"
        };
        let jerry = {
            name: "Jerry",
            age: 23,
            pet: "dog"
        };
        let kayla = {
            name: "Kayla",
            age: 20,
            pet: "cat"
        };
        let arr = [george, emmy, louis, adam, jerry, kayla];
        let result: any[][] = QueryPerformer.groupBy(arr, ["age", "pet"]);
        expect(result).to.have.length(4);
        expect(result).to.deep.include([louis, kayla]);
        expect(result).to.deep.include([george]);
        expect(result).to.deep.include([emmy, jerry]);
        expect(result).to.deep.include([adam]);
    });

});
