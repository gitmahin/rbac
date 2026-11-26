export type PermissionsType = {
  can: Set<string>;
};
export type AccessDataType = Map<string, PermissionsType>;
