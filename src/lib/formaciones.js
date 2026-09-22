// Formaciones de la cancha: para cada esquema, dónde va cada uno de los 11
// puestos (x, y en % de la cancha, con el arco propio abajo). Están en orden:
// arquero, defensores, mediocampistas y delanteros. Copiadas de la v1, donde
// estaban escritas dentro de la pantalla del partido.
export const FORMACIONES = {
  "4-4-2": [
    { pos: "PO", x: 50, y: 90 }, { pos: "DFI", x: 12, y: 74 }, { pos: "DFC", x: 37, y: 76 }, { pos: "DFC", x: 63, y: 76 }, { pos: "DFD", x: 88, y: 74 },
    { pos: "MI", x: 12, y: 50 }, { pos: "MC", x: 37, y: 52 }, { pos: "MC", x: 63, y: 52 }, { pos: "MD", x: 88, y: 50 },
    { pos: "DC", x: 37, y: 22 }, { pos: "DC", x: 63, y: 22 },
  ],
  "4-3-3": [
    { pos: "PO", x: 50, y: 90 }, { pos: "DFI", x: 12, y: 74 }, { pos: "DFC", x: 37, y: 76 }, { pos: "DFC", x: 63, y: 76 }, { pos: "DFD", x: 88, y: 74 },
    { pos: "MC", x: 28, y: 52 }, { pos: "MC", x: 50, y: 50 }, { pos: "MC", x: 72, y: 52 },
    { pos: "EI", x: 14, y: 22 }, { pos: "DC", x: 50, y: 20 }, { pos: "ED", x: 86, y: 22 },
  ],
  "4-2-3-1": [
    { pos: "PO", x: 50, y: 90 }, { pos: "DFI", x: 12, y: 74 }, { pos: "DFC", x: 37, y: 76 }, { pos: "DFC", x: 63, y: 76 }, { pos: "DFD", x: 88, y: 74 },
    { pos: "MCD", x: 37, y: 60 }, { pos: "MCD", x: 63, y: 60 },
    { pos: "MI", x: 14, y: 40 }, { pos: "MCO", x: 50, y: 38 }, { pos: "MD", x: 86, y: 40 },
    { pos: "DC", x: 50, y: 18 },
  ],
  "3-5-2": [
    { pos: "PO", x: 50, y: 90 }, { pos: "DFI", x: 22, y: 76 }, { pos: "DFC", x: 50, y: 76 }, { pos: "DFD", x: 78, y: 76 },
    { pos: "MI", x: 8, y: 50 }, { pos: "MC", x: 30, y: 52 }, { pos: "MCD", x: 50, y: 58 }, { pos: "MC", x: 70, y: 52 }, { pos: "MD", x: 92, y: 50 },
    { pos: "DC", x: 37, y: 22 }, { pos: "DC", x: 63, y: 22 },
  ],
  "4-1-4-1": [
    { pos: "PO", x: 50, y: 90 }, { pos: "DFI", x: 12, y: 74 }, { pos: "DFC", x: 37, y: 76 }, { pos: "DFC", x: 63, y: 76 }, { pos: "DFD", x: 88, y: 74 },
    { pos: "MCD", x: 50, y: 60 },
    { pos: "MI", x: 12, y: 42 }, { pos: "MC", x: 37, y: 44 }, { pos: "MC", x: 63, y: 44 }, { pos: "MD", x: 88, y: 42 },
    { pos: "DC", x: 50, y: 20 },
  ],
  "4-5-1": [
    { pos: "PO", x: 50, y: 90 }, { pos: "DFI", x: 12, y: 74 }, { pos: "DFC", x: 37, y: 76 }, { pos: "DFC", x: 63, y: 76 }, { pos: "DFD", x: 88, y: 74 },
    { pos: "MI", x: 12, y: 50 }, { pos: "MC", x: 35, y: 52 }, { pos: "MCD", x: 50, y: 56 }, { pos: "MC", x: 65, y: 52 }, { pos: "MD", x: 88, y: 50 },
    { pos: "DC", x: 50, y: 20 },
  ],
  "3-4-3": [
    { pos: "PO", x: 50, y: 90 }, { pos: "DFI", x: 22, y: 76 }, { pos: "DFC", x: 50, y: 76 }, { pos: "DFD", x: 78, y: 76 },
    { pos: "MI", x: 12, y: 50 }, { pos: "MC", x: 37, y: 52 }, { pos: "MC", x: 63, y: 52 }, { pos: "MD", x: 88, y: 50 },
    { pos: "EI", x: 14, y: 22 }, { pos: "DC", x: 50, y: 20 }, { pos: "ED", x: 86, y: 22 },
  ],
  "5-3-2": [
    { pos: "PO", x: 50, y: 90 }, { pos: "DFI", x: 8, y: 74 }, { pos: "DFC", x: 28, y: 76 }, { pos: "DFC", x: 50, y: 76 }, { pos: "DFC", x: 72, y: 76 }, { pos: "DFD", x: 92, y: 74 },
    { pos: "MC", x: 25, y: 50 }, { pos: "MC", x: 50, y: 48 }, { pos: "MC", x: 75, y: 50 },
    { pos: "DC", x: 37, y: 22 }, { pos: "DC", x: 63, y: 22 },
  ],
  "5-4-1": [
    { pos: "PO", x: 50, y: 90 }, { pos: "DFI", x: 8, y: 74 }, { pos: "DFC", x: 28, y: 76 }, { pos: "DFC", x: 50, y: 76 }, { pos: "DFC", x: 72, y: 76 }, { pos: "DFD", x: 92, y: 74 },
    { pos: "MI", x: 12, y: 50 }, { pos: "MC", x: 37, y: 52 }, { pos: "MC", x: 63, y: 52 }, { pos: "MD", x: 88, y: 50 },
    { pos: "DC", x: 50, y: 20 },
  ],
  "4-4-1-1": [
    { pos: "PO", x: 50, y: 90 }, { pos: "DFI", x: 12, y: 74 }, { pos: "DFC", x: 37, y: 76 }, { pos: "DFC", x: 63, y: 76 }, { pos: "DFD", x: 88, y: 74 },
    { pos: "MI", x: 12, y: 52 }, { pos: "MC", x: 37, y: 54 }, { pos: "MC", x: 63, y: 54 }, { pos: "MD", x: 88, y: 52 },
    { pos: "MCO", x: 50, y: 34 }, { pos: "DC", x: 50, y: 18 },
  ],
  "4-3-2-1": [
    { pos: "PO", x: 50, y: 90 }, { pos: "DFI", x: 12, y: 74 }, { pos: "DFC", x: 37, y: 76 }, { pos: "DFC", x: 63, y: 76 }, { pos: "DFD", x: 88, y: 74 },
    { pos: "MC", x: 25, y: 54 }, { pos: "MC", x: 50, y: 52 }, { pos: "MC", x: 75, y: 54 },
    { pos: "MCO", x: 35, y: 34 }, { pos: "MCO", x: 65, y: 34 },
    { pos: "DC", x: 50, y: 18 },
  ],
  "4-1-2-1-2": [
    { pos: "PO", x: 50, y: 90 }, { pos: "DFI", x: 12, y: 74 }, { pos: "DFC", x: 37, y: 76 }, { pos: "DFC", x: 63, y: 76 }, { pos: "DFD", x: 88, y: 74 },
    { pos: "MCD", x: 50, y: 60 },
    { pos: "MC", x: 32, y: 44 }, { pos: "MC", x: 68, y: 44 },
    { pos: "MCO", x: 50, y: 30 },
    { pos: "DC", x: 37, y: 18 }, { pos: "DC", x: 63, y: 18 },
  ],
};
