"use client";

import AccessBadge from "../shared/AccessBadge";

interface AccessOverviewProps {
  accessGroups: string[];
  companyStructure: any;
}

export default function AccessOverview({ accessGroups, companyStructure }: AccessOverviewProps) {
  const getAccessTypeInfo = (accessId: string) => {
    return companyStructure?.allAccessTypes?.find((at: any) => at.id === accessId);
  };

  const groupedAccess: Record<string, any[]> = {};

  accessGroups.forEach(ag => {
    const info = getAccessTypeInfo(ag);
    const category = info?.category || "other";
    if (!groupedAccess[category]) {
      groupedAccess[category] = [];
    }
    groupedAccess[category].push({
      id: ag,
      info
    });
  });

  return (
    <div className="bg-white rounded-lg shadow p-6 text-gray-900">
      <h3 className="text-xl font-semibold mb-4">My Access Overview</h3>

      {accessGroups.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No access granted yet
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedAccess).map(([category, accesses]) => (
            <div key={category} className="border rounded p-4">
              <h4 className="font-semibold text-sm mb-3 capitalize text-gray-700">
                {category.replace(/-/g, " ")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {accesses.map(({ id, info }) => (
                  <AccessBadge
                    key={id}
                    accessId={id}
                    accessName={info?.name}
                    category={category}
                    size="md"
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="mt-4 text-sm text-gray-800">
            Total: {accessGroups.length} access type(s)
          </div>
        </div>
      )}
    </div>
  );
}

