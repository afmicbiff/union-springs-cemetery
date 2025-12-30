import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Save, X } from "lucide-react";

export default function PlotTableRow({
  row,
  editingId,
  inlineEditData,
  STATUS_COLORS,
  handleInlineChange,
  handleInlineSave,
  handleInlineCancel,
  handleInlineEditStart,
  handleEditClick,
  isAdmin
}) {
  const isEditing = editingId === row._id;
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-4 font-bold text-gray-700">
        {isEditing ? (
          <Input value={inlineEditData.Section || ''} onChange={e => handleInlineChange('Section', e.target.value)} className="h-8 w-24" />
        ) : row.Section}
      </td>
      <td className="px-4 py-4 font-mono text-gray-900">
        {isEditing ? (
          <Input value={inlineEditData.Grave || ''} onChange={e => handleInlineChange('Grave', e.target.value)} className="h-8 w-16" />
        ) : row.Grave}
      </td>
      <td className="px-4 py-4 text-gray-500">
        {isEditing ? (
          <Input value={inlineEditData.Row || ''} onChange={e => handleInlineChange('Row', e.target.value)} className="h-8 w-16" />
        ) : row.Row}
      </td>
      <td className="px-4 py-4">
        {isEditing ? (
          <select
            value={inlineEditData.Status}
            onChange={e => handleInlineChange('Status', e.target.value)}
            className="h-8 text-sm border rounded px-2"
          >
            {Object.keys(STATUS_COLORS).filter(k => k !== 'Default').map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        ) : (
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[row.Status]?.split(' ').filter(c=>c.startsWith('bg') || c.startsWith('text')).join(' ')} bg-opacity-10`}>
            {row.Status}
          </span>
        )}
      </td>
      <td className="px-4 py-4 font-medium text-gray-900">
        {isEditing ? (
          <Input value={inlineEditData['Last Name'] || ''} onChange={e => handleInlineChange('Last Name', e.target.value)} className="h-8 w-32" />
        ) : row['Last Name']}
      </td>
      <td className="px-4 py-4 text-gray-500">
        {isEditing ? (
          <Input value={inlineEditData['First Name'] || ''} onChange={e => handleInlineChange('First Name', e.target.value)} className="h-8 w-32" />
        ) : row['First Name']}
      </td>
      <td className="px-4 py-4 text-gray-500 text-xs">
        {isEditing ? (
          <div className="flex flex-col gap-1">
            <Input value={inlineEditData.Birth || ''} onChange={e => handleInlineChange('Birth', e.target.value)} placeholder="Birth" className="h-7 w-24 text-xs" />
            <Input value={inlineEditData.Death || ''} onChange={e => handleInlineChange('Death', e.target.value)} placeholder="Death" className="h-7 w-24 text-xs" />
          </div>
        ) : (
          row.Birth && row.Death ? `${row.Birth} - ${row.Death}` : '-'
        )}
      </td>
      <td className="px-4 py-4">
        {isEditing ? (
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={handleInlineSave}>
              <Save className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleInlineCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          (isAdmin && row._entity === 'Plot') && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleInlineEditStart(row)}>
                  <Pencil className="mr-2 h-4 w-4" /> Quick Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEditClick(row)}>
                  <MoreHorizontal className="mr-2 h-4 w-4" /> Full Details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        )}
      </td>
    </tr>
  );
}