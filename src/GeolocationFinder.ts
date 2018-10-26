import {HttpRequest, IHttpRequest} from "./HttpRequest";
import * as querystring from "querystring";

export class GeolocationFinder {
    private baseRequestURL: string = "http://cs310.ugrad.cs.ubc.ca:11316/api/v1/project_o4k0b_r1a1b/";
    private httpRequest: IHttpRequest;

    constructor(httpRequest = new HttpRequest()) {
        this.httpRequest = httpRequest;
    }

    public getLatLonPair(address: string): Promise<ILatLonPair> {
        let escapedAddress: string = querystring.escape(address);
        return new Promise<ILatLonPair>((resolve, reject) => {
            this.httpRequest.get(this.baseRequestURL + escapedAddress)
                .then((rawResponse) => {
                    let asJson: any = JSON.parse(rawResponse);
                    if (Object.keys(asJson).includes("err")) {
                        reject(new GeolocationError(asJson.err));
                    }
                    resolve({
                        lat: asJson.lat,
                        lon: asJson.lon
                    });
                })
                .catch((err) => {
                    reject(new GeolocationError(err));
                });
        });
    }
}

export interface ILatLonPair {
    lat: number;
    lon: number;
}

export class GeolocationError extends Error {
}
