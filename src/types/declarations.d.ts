declare module "pdfjs-dist/build/pdf.mjs" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const GlobalWorkerOptions: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const getDocument: (params: any) => { promise: Promise<any> };
  export const version: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjs: any;
  export default pdfjs;
}
