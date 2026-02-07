export type PropertyReference = {
  variable: string; // "BUCKET"
  variableWithBrackets: string; // "${BUCKET}"
  variableWithBracketsStartIndex: number; // position in string
};
