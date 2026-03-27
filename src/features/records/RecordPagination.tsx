type RecordPaginationProps = {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

function RecordPagination({ page, totalPages, total, onPageChange }: RecordPaginationProps) {
  return (
    <div className="record-pagination">
      <button type="button" className="btn-light" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        上一页
      </button>
      <span>
        第 {page} / {totalPages} 页 · 共 {total} 条
      </span>
      <button type="button" className="btn-light" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        下一页
      </button>
    </div>
  )
}

export default RecordPagination
