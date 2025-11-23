'use client';

interface SignatureField {
  id: number;
  type: string;
  label?: string;
}

interface ProgressHeaderProps {
  currentIndex: number;
  totalFields: number;
  fields: SignatureField[];
  completedFields: number[];
}

export default function ProgressHeader({
  currentIndex,
  totalFields,
  fields,
  completedFields,
}: ProgressHeaderProps) {
  const progress = totalFields > 0 ? (completedFields.length / totalFields) * 100 : 0;

  return (
    <div className="sticky top-0 z-50 bg-white shadow-md p-4 border-b">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-gray-900">
            Tiến độ ký: {completedFields.length} / {totalFields}
          </span>
          <span className="text-sm text-gray-600 font-medium">
            {Math.round(progress)}%
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {fields.map((field, index) => {
            const isCompleted = completedFields.includes(field.id);
            const isCurrent = index === currentIndex;

            return (
              <div
                key={field.id}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                  isCompleted
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : isCurrent
                    ? 'bg-blue-100 text-blue-800 border border-blue-300 animate-pulse'
                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                }`}
              >
                {isCompleted && '✓ '}
                {field.label || `Field ${index + 1}`}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
