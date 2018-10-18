import {expect} from "chai";
import {GeolocationFinder, ILatLonPair} from "../src/GeolocationFinder";

describe("Test http request maker", () => {
   it ("Simple test", async () => {
       let geolocationFinder: GeolocationFinder = new GeolocationFinder();
       let response: ILatLonPair = await geolocationFinder.getLatLonPair("6245 Agronomy Road V6T 1Z4");
       expect(response.lat).to.eq(49.26125);
       expect(response.lon).to.eq(-123.24807);
   });
});
