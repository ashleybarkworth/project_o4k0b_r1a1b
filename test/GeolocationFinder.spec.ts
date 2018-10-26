import {expect} from "chai";
import {GeolocationError, GeolocationFinder, ILatLonPair} from "../src/GeolocationFinder";
import {IHttpRequest} from "../src/HttpRequest";

describe("Test http request maker", () => {
    it("Simple test", async () => {
        let geolocationFinder: GeolocationFinder = new GeolocationFinder();
        let response: ILatLonPair = await geolocationFinder.getLatLonPair("6245 Agronomy Road V6T 1Z4");
        expect(response.lat).to.eq(49.26125);
        expect(response.lon).to.eq(-123.24807);
    });
    it("Test error", async () => {
        let httpRequest: IHttpRequest = new UnexpectedError();
        let geolocationFinder: GeolocationFinder = new GeolocationFinder(httpRequest);
        let response;
        try {
            response = await geolocationFinder.getLatLonPair("6245 Agronomy Road V6T 1Z4");
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceof(GeolocationError);
        }
    });
    it("Test error parameter", async () => {
        let httpRequest: IHttpRequest = new ErrorAsParameter();
        let geolocationFinder: GeolocationFinder = new GeolocationFinder(httpRequest);
        let response;
        try {
            response = await geolocationFinder.getLatLonPair("6245 Agronomy Road V6T 1Z4");
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceof(GeolocationError);
        }
    });
});

class UnexpectedError implements IHttpRequest {
    public get(url: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            reject(new Error("rejected"));
        });
    }
}

class ErrorAsParameter implements IHttpRequest {
    public get(url: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            resolve({
                error: "Error message"
            });
        });
    }
}
