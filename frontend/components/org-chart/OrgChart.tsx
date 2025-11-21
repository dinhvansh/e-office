import React from 'react';
import { Tree, TreeNode } from '@/components/ui/tree';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Folder, Plus, Edit, Trash2 } from 'lucide-react';

interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  parent_id?: number;
  is_active: boolean;
  manager?: {
    id: number;
    full_name?: string;
    email: string;
  };
  _count?: {
    users: number;
    children: number;
  };
  children?: Department[];
}

interface OrgChartProps {
  departments: Department[];
  selectedDepartmentId: number | null;
  onDepartmentSelect: (departmentId: number | null) => void;
  onAddChild?: (department: Department) => void;
  onEdit?: (department: Department) => void;
  onDelete?: (department: Department) => void;
}

export function OrgChart({ departments, selectedDepartmentId, onDepartmentSelect, onAddChild, onEdit, onDelete }: OrgChartProps) {
  // Build tree structure from flat list
  const buildTree = (depts: Department[]): TreeNode[] => {
    const roots: Department[] = depts.filter(d => !d.parent_id);

    const buildNode = (dept: Department): TreeNode => {
      const children = depts
        .filter(d => d.parent_id === dept.id)
        .map(buildNode);

      return {
        id: dept.id,
        label: dept.name,
        data: dept,
        children: children.length > 0 ? children : undefined
      };
    };

    return roots.map(buildNode);
  };

  const treeData = buildTree(departments);

  const renderDepartmentNode = (node: TreeNode, level: number, isSelected: boolean) => {
    const dept = node.data as Department;
    const userCount = dept._count?.users || 0;
    const childCount = dept._count?.children || 0;
    const [showActions, setShowActions] = React.useState(false);

    return (
      <div 
        className="flex items-center justify-between gap-2 min-w-0 group"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Folder className={cn(
            "h-4 w-4 flex-shrink-0",
            isSelected ? "text-blue-600" : "text-gray-500"
          )} />
          <div className="min-w-0 flex-1">
            <div className={cn(
              "text-sm font-medium truncate",
              isSelected ? "text-blue-700" : "text-gray-900"
            )}>
              {dept.name}
            </div>
            {dept.code && (
              <div className="text-xs text-gray-500 truncate">{dept.code}</div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          {userCount > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              <Users className="h-3 w-3 mr-0.5" />
              {userCount}
            </Badge>
          )}
          
          {/* Quick Actions - Show on hover */}
          {showActions && (
            <div className="flex items-center gap-0.5 ml-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChild?.(dept);
                }}
                className="p-1 hover:bg-blue-100 rounded text-blue-600"
                title="Thêm phòng ban con"
              >
                <Plus className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(dept);
                }}
                className="p-1 hover:bg-gray-100 rounded text-gray-600"
                title="Sửa"
              >
                <Edit className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(dept);
                }}
                className="p-1 hover:bg-red-100 rounded text-red-600"
                title="Xóa"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full">
      <div className="mb-3 flex items-center gap-2 px-2">
        <Building2 className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Cấu trúc tổ chức</h3>
      </div>
      
      <Tree
        data={treeData}
        selectedNodeId={selectedDepartmentId}
        onNodeClick={(node) => {
          const dept = node.data as Department;
          onDepartmentSelect(dept.id);
        }}
        renderNode={renderDepartmentNode}
        className="max-h-[calc(100vh-200px)]"
      />
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
