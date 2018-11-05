/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
CampusExplorer.buildQuery = function () {
    let query = {};
    let tab = document.getElementsByClassName("tab-panel active")[0];
    let form = firstChildWithTag(tab, "FORM");
    query["WHERE"] = buildFilter(form);
    query["OPTIONS"] = buildOptions(form);
    let transformations = buildTransformations(form);
    if (transformations != null) {
        query["TRANSFORMATIONS"] = transformations;
    }
    console.log(query);
    return query;
};

/**
 * Returns the filter body
 */
buildFilter = function (form) {
    let obj = {};
    let selectedRadioButton = getLogicComparison(form);
    let filterList = buildFilterList(form);
    if (filterList.length !== 0) {
        switch (selectedRadioButton) {
            case "AND":
            case "OR":
                if (filterList.length === 1) obj = filterList[0];
                else obj[selectedRadioButton] = filterList;
                break;
            case "NONE":
                obj["NOT"] = (filterList.length === 1) ? filterList[0] : {"OR": filterList};
        }
    }
    return obj;

    /**
     * Determines whether the outer logic comparison should be AND, OR, or an OR nested in a NOT
     * @returns {string} either AND, OR, or NONE
     */
    function getLogicComparison(form) {
        let inputs = allSubchildrenWithTag(firstSubchildWithClass(form, "control-group condition-type"), "INPUT");
        let checked = selectFirst((i => i.checked), inputs);
        switch (checked.value) {
            case "all":
                return "AND";
            case "any":
                return "OR";
            case "none":
                return "NONE";
            default:
                throw new Error("Something is not right with dem radio buttons :thinking_face:");
        }
    }
};

/**
 * Gets the list of inner filters passed into the logic comparison
 * @returns {Array} an array of objects representing filters, e.g. {NOT: {EQ: {"courses_avg": 95}}}
 */
buildFilterList = function (form) {
    let result = [];
    let container = firstSubchildWithClass(form, "conditions-container");

    for (let filter of container.childNodes) {
        let outerObj = {};
        let operator = getOperator(filter); // get the operator (IS, GT, LT, EQ)
        outerObj[operator] = getInnerObj(filter, (operator !== "IS")); // get the inner object (e.g. {"courses_year": 1900}
        if (firstChildWithTag(firstChildWithClass(filter, "control not"), "INPUT").checked) {
            result.push({"NOT": outerObj}); // If not box is checked, wrap everything in a NOT
        } else {
            result.push(outerObj); // otherwise, just push object as is
        }
    }
    return result;

    /**
     * Returns an object of form {field_value}
     * @param filter                The HTML element representing the individual filter being considered
     * @param valueMustBeNumber     True if value must be converted to a number (will throw an exception if not possible)
     */
    function getInnerObj(filter, valueMustBeNumber) {
        let innerObj = {};
        let field = getSelectedFromSelectChild(firstChildWithClass(filter, "control fields"));
        let value = firstChildWithTag(firstChildWithClass(filter, "control term"), "INPUT").value;
        if (valueMustBeNumber) {
            if (!isNaN(value)) {
                value = Number(value);
            }
        }
        innerObj[getDataset() + field] = value;
        return innerObj;
    }

    /**
     * Returns the operator (GT, IS, EQ, LT)
     * @param filter       The HTML element representing the individual filter being considered
     * @returns {*}        The operator
     */
    function getOperator(filter) {
        let controlOperators = firstChildWithClass(filter, "control operators"); // this has a child object of type SELECT
        return getSelectedFromSelectChild(controlOperators);
    }
};

buildOptions = function (form) {
    let optionsObj = {};
    optionsObj["COLUMNS"] = buildColumns(form);
    let order = buildOrder(form);
    if (order != null) {
        optionsObj["ORDER"] = order;
    }
    return optionsObj;

    function buildOrder(form) {
        let options = allSubchildrenWithTag(firstSubchildWithClass(form, "control order fields"), "OPTION");
        let orderFields = options.filter((o) => o.selected).map((o) => {
            if (o.className === "transformation") {
                return o.value;
            } else {
                return getDataset() + o.value;
            }
        });
        if (orderFields.length === 0) {
            return null;
        }
        let isDescending = firstChildWithTag(firstSubchildWithClass(form, "control descending"), "INPUT").checked;
        let dir = isDescending ? "DOWN" : "UP";
        return {
            keys: orderFields,
            dir: dir
        };
    }

    /**
     * Returns selected columns (e.g. ["courses_XXX", "courses_YYY", "courses_ZZZ"]
     */
    function buildColumns(form) {
        let columns = [];
        let groups = firstSubchildWithClass(form, "control-group");
        let inputs = allSubchildrenWithTag(groups, "INPUT");
        for (let input of inputs) {
            if (input.checked) {
                let val = (input.parentElement.className === "control field") ? getDataset() + input.value : input.value;
                columns.push(val);
            }
        }
        return columns;
    }
};

buildTransformations = function (form) {

    let transformations = {};
    let groups = buildGroups(form);
    transformations["GROUP"] = groups;
    let applies = buildApplies(form);
    transformations["APPLY"] = applies;

    if (groups.length === 0 && applies.length === 0) {
        return null;
    }

    return transformations;

    function buildGroups(form) {
        let columns = [];
        let groupElement = firstSubchildWithClass(form, "form-group groups");
        let fields = allSubchildrenWithClass(groupElement, "control field");
        for (let field of fields) {
            let input = firstChildWithTag(field, "INPUT");
            if (input.checked) {
                columns.push(getDataset() + input.value);
            }
        }
        return columns;
    }

    function buildApplies(form) {
        let result = [];
        let container = firstSubchildWithClass(form, "transformations-container");
        for (let transformation of container.childNodes) {
            let field = getSelectedFromSelectChild(firstChildWithClass(transformation, "control fields"));
            let applyToken = getSelectedFromSelectChild(firstChildWithClass(transformation, "control operators"));
            let innerObj = {};
            innerObj[applyToken] = getDataset() + field;
            let applyName = firstChildWithTag(firstChildWithClass(transformation, "control term"), "INPUT").value;
            let apply = {};
            apply[applyName] = innerObj;
            result.push(apply);
        }
        return result;
    }
};

/**
 * Determines which tab is active
 * @returns {string} "rooms_" if the rooms tab is active, "courses_" if the courses tab is active
 */
getDataset = function () {
    let tabs = document.getElementsByClassName("tab-panel active");
    if (tabs[0].id === "tab-courses") {
        return "courses_";
    } else if (tabs[0].id === "tab-rooms") {
        return "rooms_";
    } else {
        throw new Error("Selected tab was neither courses nor rooms");
    }
};

/**
 * Gets a child of type SELECT, then returns the value of the selected option within that SELECT
 */
function getSelectedFromSelectChild(element) {
    let select = firstChildWithTag(element, "SELECT");
    return select.options[select.selectedIndex].value;
}

/**
 * Return the first child of element that has the given class name
 */
firstChildWithClass = function (element, className) {
    return selectFirst((e => e.className === className), element.childNodes);
};

/**
 * Return the first child somewhere in the subchild tree with the given class name
 */
firstSubchildWithClass = function (element, className) {
    if (element.className === className) {
        return element;
    } else if (element.childNodes.length !== 0) {
        for (let child of element.childNodes) {
            let recursiveResult = firstSubchildWithClass(child, className);
            if (recursiveResult !== null) {
                return recursiveResult;
            }
        }
    }
    return null;
};

allSubchildrenWithTag = function (element, tagName) {
    return selectAllSubchildren((e) => e.tagName === tagName, element);

};

allSubchildrenWithClass = function (element, className) {
    return selectAllSubchildren((e) => e.className === className, element);
};

selectAllSubchildren = function (f, element) {
    let results = [];
    let childStack = [element];
    while (childStack.length > 0) {
        let element = childStack.pop();
        if (f(element)) {
            results.push(element);
        }
        element.childNodes.forEach((e) => childStack.push(e));
    }
    return results;
};

/**
 * Return the first child of element that has the given tag (e.g. DIV, H1, INPUT)
 */
firstChildWithTag = function (element, tagName) {
    return selectFirst((e => e.tagName === tagName), element.childNodes);
};

/**
 * Finds and returns the first element of a list for which f(e) is true
 */
selectFirst = function (f, lst) {
    for (let e of lst) {
        if (f(e)) {
            return e;
        }
    }
    return null;
};
