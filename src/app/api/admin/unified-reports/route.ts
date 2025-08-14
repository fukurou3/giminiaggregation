/**
 * Professional Report Management API
 * 
 * 統合通報管理システムのAPIエンドポイント
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/adminAuth';
import { ReportService } from '@/lib/reports/reportService';
import { 
  ReportFilters, 
  ReportSortOptions,
  ActionType,
  BulkActionRequest 
} from '@/types/ReportSystem';

// ========================================
// GET - 通報一覧取得
// ========================================

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateAdmin(request);
    if (!user) {
      return NextResponse.json(
        { error: '管理者権限が必要です' }, 
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    
    // Query parameters parsing
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '25', 10);
    
    // Filters parsing
    const filters: ReportFilters = {
      status: url.searchParams.get('status')?.split(',') as any,
      priority: url.searchParams.get('priority')?.split(',') as any,
      category: url.searchParams.get('category')?.split(',') as any,
      type: url.searchParams.get('type')?.split(',') as any,
      searchQuery: url.searchParams.get('search') || undefined,
      overdue: url.searchParams.get('overdue') === 'true',
      assignedTo: url.searchParams.get('assignedTo')?.split(','),
      tags: url.searchParams.get('tags')?.split(',')
    };
    
    // Remove empty filters
    Object.keys(filters).forEach(key => {
      const value = (filters as any)[key];
      if (!value || (Array.isArray(value) && value.length === 0)) {
        delete (filters as any)[key];
      }
    });
    
    // Date range parsing
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    if (dateFrom && dateTo) {
      filters.dateRange = {
        from: new Date(dateFrom),
        to: new Date(dateTo)
      };
    }
    
    // Sorting
    const sortField = url.searchParams.get('sortField') || 'createdAt';
    const sortDirection = url.searchParams.get('sortDirection') || 'desc';
    const sorting: ReportSortOptions = {
      field: sortField as any,
      direction: sortDirection as 'asc' | 'desc'
    };
    
    // Fetch reports
    const response = await ReportService.getReports(
      filters,
      sorting,
      page,
      Math.min(pageSize, 100) // Max 100 per page
    );
    
    // Include analytics if requested
    const includeAnalytics = url.searchParams.get('includeAnalytics') === 'true';
    if (includeAnalytics) {
      const analytics = await ReportService.getAnalytics(filters.dateRange);
      response.analytics = analytics;
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('GET unified-reports error:', error);
    return NextResponse.json(
      { 
        error: '通報一覧の取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ========================================
// POST - アクション実行
// ========================================

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateAdmin(request);
    if (!user) {
      return NextResponse.json(
        { error: '管理者権限が必要です' }, 
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { type, reportId, reportIds, action, details } = body;
    
    // Single action
    if (type === 'single' && reportId && action) {
      const result = await ReportService.executeAction(
        reportId,
        action as ActionType,
        user.uid,
        details || {}
      );
      
      return NextResponse.json(result);
    }
    
    // Bulk action
    if (type === 'bulk' && reportIds && action) {
      const bulkRequest: BulkActionRequest = {
        reportIds,
        action: action as ActionType,
        reason: details?.reason,
        template: details?.template
      };
      
      const result = await ReportService.executeBulkAction(
        bulkRequest,
        user.uid
      );
      
      return NextResponse.json(result);
    }
    
    return NextResponse.json(
      { error: '無効なリクエスト形式です' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('POST unified-reports error:', error);
    return NextResponse.json(
      { 
        error: 'アクションの実行に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ========================================
// PUT - 通報更新
// ========================================

export async function PUT(request: NextRequest) {
  try {
    const user = await authenticateAdmin(request);
    if (!user) {
      return NextResponse.json(
        { error: '管理者権限が必要です' }, 
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { reportId, updates } = body;
    
    if (!reportId) {
      return NextResponse.json(
        { error: 'reportIdが必要です' },
        { status: 400 }
      );
    }
    
    await ReportService.updateReport(reportId, updates, user.uid);
    
    return NextResponse.json({
      success: true,
      message: '通報が正常に更新されました'
    });
    
  } catch (error) {
    console.error('PUT unified-reports error:', error);
    return NextResponse.json(
      { 
        error: '通報の更新に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}