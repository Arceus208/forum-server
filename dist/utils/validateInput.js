"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireMinLength = exports.requireMaxLength = exports.validateEmail = void 0;
const validateEmail = (input) => {
    return input.includes("@");
};
exports.validateEmail = validateEmail;
const requireMaxLength = (input, num) => {
    return input.length <= num;
};
exports.requireMaxLength = requireMaxLength;
const requireMinLength = (input, num) => {
    return input.length >= num;
};
exports.requireMinLength = requireMinLength;
//# sourceMappingURL=validateInput.js.map