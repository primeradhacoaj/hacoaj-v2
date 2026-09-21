// Une nombres de clases CSS ignorando los valores vacíos.
// cx("a", false, "b") -> "a b"
export function cx(...clases) {
  return clases.filter(Boolean).join(" ");
}
