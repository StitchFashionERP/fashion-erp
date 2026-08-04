import {
  aiWorkspaceSteps,
  type AiWorkspaceStepId,
} from "@/lib/ai-studio/workspace-types";
import styles from "./workspace-components.module.css";

type WorkflowStepsProps = {
  activeStep?: AiWorkspaceStepId;
  completedSteps?: AiWorkspaceStepId[];
};

export function WorkflowSteps({
  activeStep = "SOURCE",
  completedSteps = [],
}: WorkflowStepsProps) {
  return (
    <section
      className={styles.workflow}
      aria-label="AI Studio-voortgang"
    >
      {aiWorkspaceSteps.map((step, index) => {
        const completed = completedSteps.includes(step.id);
        const active = activeStep === step.id;

        return (
          <div
            key={step.id}
            className={`${styles.workflowStep} ${
              completed ? styles.workflowStepCompleted : ""
            } ${
              active ? styles.workflowStepActive : ""
            }`}
          >
            <span className={styles.workflowNumber}>
              {completed ? "✓" : index + 1}
            </span>

            <div className={styles.workflowText}>
              <strong>{step.label}</strong>
              <span>{step.description}</span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
