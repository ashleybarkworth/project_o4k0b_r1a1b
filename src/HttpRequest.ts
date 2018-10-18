import * as http from "http";

export class HttpRequest {

    /*
     * Acknowledgement: This method borrows heavily from the example at https://davidwalsh.name/nodejs-http-request
     */
    public get(url: string): Promise<any> {
        return new Promise<any> ((resolve, reject) => {
            http.get(url, (response) => {
                let responseBody = "";
                response.on("data", (str) => {
                    responseBody += str;
                });
                response.on("error", (e) => {
                    reject(e);
                });
                response.on("end", () => {
                    resolve(responseBody);
                });
            });
        });
    }
}
