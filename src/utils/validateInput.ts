export const validateEmail = (input: string) => {
  return input.includes("@");
};

export const requireMaxLength = (input: string, num: Number) => {
  return input.length <= num;
};

export const requireMinLength = (input: string, num: Number) => {
  return input.length >= num;
};
