export type PermissionsType = {
  can: Set<string>;
};
export type AccessDataType = Map<string, PermissionsType>;

export class RbacDataProvider {
  protected access: AccessDataType | null = null;
  constructor() {
    this.access = new Map();
  }
}
