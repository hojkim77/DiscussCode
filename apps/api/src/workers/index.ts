import { createCollectTrendingWorker } from "./collect-trending.worker.js";
import { createCollectIssuesWorker } from "./collect-issues.worker.js";
import { createGenerateSummaryWorker } from "./generate-summary.worker.js";
import { createRecalcHeatScoreWorker } from "./recalc-heat-score.worker.js";

export function startWorkers() {
  const workers = [
    createCollectTrendingWorker(),
    createCollectIssuesWorker(),
    createGenerateSummaryWorker(),
    createRecalcHeatScoreWorker(),
  ];

  for (const worker of workers) {
    worker.on("failed", (job, err) => {
      console.error(`[Worker] Job ${job?.id} failed:`, err.message);
    });
  }

  return workers;
}
