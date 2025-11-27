#!/usr/bin/env python3
"""
Script to merge new metric card UI into existing workflows page
Keeps all logic (mutations, handlers, dialogs) and only replaces the main render section
"""

# Read the old file
with open('frontend/app/(dashboard)/workflows/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the return statement and replace only the main content section
# Keep everything before return and all dialogs after

# New metric card UI for the main content
new_ui = '''  // Filter workflows
  const displayWorkflows = filteredWorkflows || workflows || [];

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Đang hoạt động
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-600 flex items-center gap-1">
        <XCircle className="w-3 h-3" />
        Tạm dừng
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Quy trình Phê duyệt</h1>
          <p className="text-sm text-gray-500 mt-1">Tạo và quản lý các quy trình phê duyệt văn bản</p>
        </div>
        <Button onClick={handleCreateWorkflow} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Tạo quy trình mới
        </Button>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Tìm theo tên quy trình..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                Tất cả
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('active')}
                className={statusFilter === 'active' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                Đang hoạt động
              </Button>
              <Button
                variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('inactive')}
              >
                Tạm dừng
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflows Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : displayWorkflows.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayWorkflows.map((workflow) => (
            <Card 
              key={workflow.id} 
              className="hover:shadow-lg transition-shadow border-l-4"
              style={{ borderLeftColor: workflow.is_active ? '#10b981' : '#9ca3af' }}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 mb-2">
                      {workflow.name}
                    </h3>
                    {getStatusBadge(workflow.is_active)}
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {workflow.description || 'Chưa có mô tả'}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Số bước:</span>
                    <span className="font-medium text-gray-900">{workflow.steps?.length || 0} bước</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditWorkflow(workflow)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteWorkflow(workflow.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                    <button
                      onClick={() => handleManageSteps(workflow)}
                      className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Quản lý bước"
                    >
                      <Settings className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={workflow.is_active}
                      onCheckedChange={() => {
                        setEditingWorkflow(workflow);
                        setWorkflowFormData({
                          name: workflow.name,
                          description: workflow.description || '',
                        });
                        saveWorkflowMutation.mutate();
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Workflow className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || statusFilter !== 'all' ? 'Không tìm thấy quy trình' : 'Chưa có quy trình nào'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || statusFilter !== 'all' 
                ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'
                : 'Tạo quy trình phê duyệt đầu tiên của bạn'
              }
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={handleCreateWorkflow} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Tạo quy trình mới
              </Button>
            )}
          </CardContent>
        </Card>
      )}
'''

# Find where to insert - after getApproverLabel function, before the old return
import re

# Find the getApproverLabel function
pattern = r'(const getApproverLabel.*?\n  \};)\s*\n\s*return \('
match = re.search(pattern, content, re.DOTALL)

if match:
    before_return = content[:match.end(1)]
    
    # Find all dialogs (everything after the main return closing)
    # Look for the workflow dialog
    dialog_pattern = r'(\s*{/\* Workflow Dialog \*/.*)'
    dialog_match = re.search(dialog_pattern, content, re.DOTALL)
    
    if dialog_match:
        dialogs = dialog_match.group(1)
        
        # Combine: before + new UI + dialogs
        new_content = before_return + '\n\n' + new_ui + dialogs
        
        # Write the new file
        with open('frontend/app/(dashboard)/workflows/page.tsx', 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print("✅ Successfully merged new UI!")
        print("📝 File updated: frontend/app/(dashboard)/workflows/page.tsx")
    else:
        print("❌ Could not find dialogs section")
else:
    print("❌ Could not find insertion point")
