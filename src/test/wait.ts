export default function wait(ms): Promise<number> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(ms), ms);
  });
}
