import React from 'react';
import AdoService from '../services/adoService.js';

export default function DevOpsReview({ items = [], settings }) {
  const service = new AdoService(
    settings.azureOrg,
    settings.azurePat,
    settings.azureProjects,
    settings.azureTags,
    settings.azureArea,
    settings.azureIteration
  );

  const treeProblems = service.findTreeProblems(items);
  const missingAcceptance = service.findMissingAcceptanceCriteria(items);

  const renderList = (list) => (
    <ul className="ml-4 list-disc text-xs mt-1">
      {list.map((i) => (
        <li key={i.id}>
          <span className="font-mono mr-1">{i.id}</span>
          {i.title}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <h2 className="font-semibold mb-2">DevOps Review</h2>
      <div className="space-y-4">
        <div>
          <div className="font-semibold text-sm">
            DevOps Tree Problems ({treeProblems.length})
          </div>
          {treeProblems.length > 0 && renderList(treeProblems)}
        </div>
        <div>
          <div className="font-semibold text-sm">
            Missing Acceptance Criteria ({missingAcceptance.length})
          </div>
          {missingAcceptance.length > 0 && renderList(missingAcceptance)}
        </div>
      </div>
    </div>
  );
}
