export default function validateDocument(
  doc: Document,
  expectedLocalName: string,
  docDescriptiveName?: string,
): void {
  if (doc === undefined || doc === null) {
    throw new Error(`doc is null/undefined`);
  }
  const { localName } = doc.documentElement;
  if (localName !== expectedLocalName) {
    const check = docDescriptiveName ? ` Check that document is really a "${docDescriptiveName}".` : "";
    throw new Error(`document.documentElement.localName is "${localName}" when "${expectedLocalName}" was expected.${check}`);
  }
}
