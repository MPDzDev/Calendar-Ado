import React from 'react';
import AdoService from '../services/adoService.js';

export default function DevOpsReview({ items = [], settings }) {
  const service = new AdoService(
    settings.azureOrg,
    settings.azurePat,
    settings.azureProjects,
    settings.azureTags,
    settings.azureArea,
    settings.azureIteration,
    true,
    settings.projectItems
  );

  const treeProblems = service.findTreeProblems(items);
  const shortDescriptions = service.findMissingOrShortDescription(items);
  const shortAcceptance = service.findMissingAcceptanceCriteria(
    items,
    20,
    ['feature', 'user story', 'evolution']
  );
  const missingStoryPoints = service.findMissingStoryPoints(items);

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
            Missing or Short Description ({shortDescriptions.length})
          </div>
          {shortDescriptions.length > 0 && renderList(shortDescriptions)}
        </div>
        <div>
          <div className="font-semibold text-sm">
            Missing or Short Acceptance Criteria ({shortAcceptance.length})
          </div>
          {shortAcceptance.length > 0 && renderList(shortAcceptance)}
        </div>
        <div>
          <div className="font-semibold text-sm">
            Missing Story Points ({missingStoryPoints.length})
          </div>
          {missingStoryPoints.length > 0 && renderList(missingStoryPoints)}
        </div>
      </div>
    </div>
  );
}
