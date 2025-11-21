import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TreeNode {
  id: string | number;
  label: string;
  children?: TreeNode[];
  data?: any;
}

interface TreeItemProps {
  node: TreeNode;
  level: number;
  onNodeClick?: (node: TreeNode) => void;
  renderNode?: (node: TreeNode, level: number, isSelected: boolean) => React.ReactNode;
  isExpanded?: boolean;
  isSelected?: boolean;
  onToggle?: (nodeId: string | number) => void;
}

function TreeItem({ 
  node, 
  level, 
  onNodeClick, 
  renderNode, 
  isExpanded = false,
  isSelected = false,
  onToggle 
}: TreeItemProps) {
  const hasChildren = node.children && node.children.length > 0;
  const paddingLeft = level * 20;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren && onToggle) {
      onToggle(node.id);
    }
  };

  const handleNodeClick = () => {
    if (onNodeClick) {
      onNodeClick(node);
    }
  };

  return (
    <div className="select-none">
      <div 
        className={cn(
          "flex items-center py-2 px-2 rounded cursor-pointer transition-colors",
          isSelected ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"
        )}
        style={{ paddingLeft: `${paddingLeft + 8}px` }}
        onClick={handleNodeClick}
      >
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="mr-1 p-0.5 hover:bg-gray-200 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-600" />
            )}
          </button>
        ) : (
          <div className="w-5 mr-1" />
        )}
        
        <div className="flex-1 min-w-0">
          {renderNode ? renderNode(node, level, isSelected) : (
            <span className="text-sm truncate">{node.label}</span>
          )}
        </div>
      </div>
      
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeItemWrapper
              key={child.id}
              node={child}
              level={level + 1}
              onNodeClick={onNodeClick}
              renderNode={renderNode}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Wrapper to handle expanded/selected state from parent
function TreeItemWrapper(props: Omit<TreeItemProps, 'isExpanded' | 'isSelected'>) {
  return <TreeItem {...props} isExpanded={false} isSelected={false} />;
}

interface TreeProps {
  data: TreeNode[];
  onNodeClick?: (node: TreeNode) => void;
  renderNode?: (node: TreeNode, level: number, isSelected: boolean) => React.ReactNode;
  selectedNodeId?: string | number | null;
  className?: string;
}

export function Tree({ data, onNodeClick, renderNode, selectedNodeId, className }: TreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string | number>>(new Set());

  const handleToggle = (nodeId: string | number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderTreeItem = (node: TreeNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNodeId === node.id;

    return (
      <TreeItem
        key={node.id}
        node={node}
        level={level}
        onNodeClick={onNodeClick}
        renderNode={renderNode}
        isExpanded={isExpanded}
        isSelected={isSelected}
        onToggle={handleToggle}
      />
    );
  };

  return (
    <div className={cn('border rounded-lg bg-white overflow-auto', className)}>
      {data.length > 0 ? (
        data.map((node) => renderTreeItem(node))
      ) : (
        <div className="p-4 text-center text-sm text-gray-500">
          Không có dữ liệu
        </div>
      )}
    </div>
  );
}

export type { TreeNode };
