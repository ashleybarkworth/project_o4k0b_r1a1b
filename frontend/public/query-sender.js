/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */
CampusExplorer.sendQuery = function(query) {
    return new Promise(function(fulfill, reject) {
        let httpRequest = new XMLHttpRequest();

        httpRequest.setRequestHeader("Content-Type", "application/json");
        httpRequest.open("POST", "http://localhost:4321/query");

        httpRequest.onload = function () {
            console.log(this.responseText); //todo
            fulfill(this.responseText); // todo
        };
        httpRequest.onerror = function (err) {
            console.log(err);
            reject('error'); // todo
        };
        httpRequest.send(query);
    });
};
