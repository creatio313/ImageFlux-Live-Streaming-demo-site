export function toOptionalInteger(value: string) {
  const trimmedValue = value.trim();
  if (trimmedValue === "") {
    return undefined;
  }

  const parsedValue = Number(trimmedValue);
  if (!Number.isInteger(parsedValue)) {
    return undefined;
  }

  return parsedValue;
}

export function toOptionalNumber(value: string) {
  const trimmedValue = value.trim();
  if (trimmedValue === "") {
    return undefined;
  }

  const parsedValue = Number(trimmedValue);
  if (Number.isNaN(parsedValue)) {
    return undefined;
  }

  return parsedValue;
}
