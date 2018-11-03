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
                obj[selectedRadioButton] = filterList;
                break;
            case "NONE":
                obj["NOT"] = {"OR": filterList}
        }
    }
    return obj;

    /**
     * Determines whether the outer logic comparison should be AND, OR, or an OR nested in a NOT
     * @returns {string} either AND, OR, or NONE
     */
    function getLogicComparison(form) {
        if (document.getElementById("courses-conditiontype-all").checked) return "AND";
        if (document.getElementById("courses-conditiontype-any").checked) return "OR";
        if (document.getElementById("courses-conditiontype-none").checked) return "NONE";
        throw new Error("Something is not right with dem radio buttons :thinking_face:");
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
            if (isNaN(value)) {
                throw new Error("Not a number!");
            }
            value = Number(value);
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

buildOptions = function() {
   let optionsObj = {};
   optionsObj["COLUMNS"] = buildColumns();
   let order = buildOrder();
   if (order !== null) {
       optionsObj["ORDER"] = order;
   }
   return optionsObj;

  function buildOrder() {
      return null;
  }

  function buildColumns() {
    let columns = [];
    let fields = document.getElementsByClassName("control field");
    for (let field of fields) {
        let input = firstChildWithTag(field, "INPUT");
        if (input.checked) {
          columns.push(getDataset() + input.value);
      }
    }
    return columns;
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
firstSubchildWithClass = function(element, className) {
  if (element.className === className) {
      return element;
  } else if (element.childNodes.length !== 0) {
      for (let child of element.childNodes) {
          let recursiveResult = firstSubchildWithClass(child, className);
          if (recursiveResult !== null) {
              console.log("Returning ");
              console.log(recursiveResult);
              return recursiveResult;
          }
      }
  }
  return null;
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
