export type AiWorkspaceStepId =
  | "SOURCE"
  | "SAVED"
  | "PACKSHOT"
  | "APPROVAL"
  | "LINKED";

export type AiWorkspaceStep = {
  id: AiWorkspaceStepId;
  label: string;
  description: string;
};

export type AiWorkspaceState = {
  activeStep: AiWorkspaceStepId;
  completedSteps: AiWorkspaceStepId[];
};

export const aiWorkspaceSteps: AiWorkspaceStep[] = [
  {
    id: "SOURCE",
    label: "Bronfoto",
    description: "Originele productfoto selecteren.",
  },
  {
    id: "SAVED",
    label: "Opgeslagen",
    description: "Bronfoto centraal bewaren.",
  },
  {
    id: "PACKSHOT",
    label: "Packshot",
    description: "AI-packshot genereren.",
  },
  {
    id: "APPROVAL",
    label: "Goedkeuren",
    description: "Resultaat beoordelen.",
  },
  {
    id: "LINKED",
    label: "Koppelen",
    description: "Beeld aan artikel koppelen.",
  },
];
