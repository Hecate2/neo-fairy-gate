function to_list(element) {
    if (Array.isArray(element)) {
        return element;
    }
    if (element !== null && element !== undefined) {
        return [element];
    }
    return [];
}
