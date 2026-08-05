export function sizeToGridClass(size: string): string {
  switch (size) {
    case "small":
      return "col-span-12 sm:col-span-3";
    case "medium":
      return "col-span-12 sm:col-span-6";
    case "large":
      return "col-span-12 sm:col-span-9";
    case "full":
      return "col-span-12";
    default:
      return "col-span-12 sm:col-span-6";
  }
}
