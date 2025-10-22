import { Component, OnInit, OnDestroy, ViewChild, ElementRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, debounceTime, takeUntil } from 'rxjs';

import { TemplateService } from '../../core/services/template.service';
import { StorageService } from '../../core/services/storage.service';
import { Template, TemplateStatus, VariableType } from '../../core/models';

declare var monaco: any;

interface TemplateVariable {
  name: string;
  type: VariableType;
  description?: string;
  defaultValue?: any;
  required: boolean;
}

type DocumentSection = 'header' | 'body' | 'footer' | 'pagination';
type DataTab = 'xml' | 'css';

/**
 * Template Editor Component - PrexView Studio Style
 * Replica exacta de la interfaz de PrexView
 */
@Component({
  selector: 'app-template-editor-prexview',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatToolbarModule,
    MatTabsModule,
    MatProgressBarModule
  ],
  template: `
    <div class="prexview-studio h-screen flex flex-col bg-gray-100">

      <!-- Top Menu Bar -->
      <div class="menu-bar bg-gray-50 px-4 py-2 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-2">
              <div class="w-4 h-4 bg-green-500 rounded-full"></div>
              <span class="text-sm font-medium text-gray-800">PrexView Studio</span>
            </div>
            <div class="text-sm text-gray-600 cursor-pointer hover:text-gray-800">Edit</div>
            <div class="text-sm text-gray-600 cursor-pointer hover:text-gray-800">Window</div>
            <div class="text-sm text-gray-600 cursor-pointer hover:text-gray-800">Help</div>
          </div>

          <div class="flex items-center space-x-1">
            <button class="w-3 h-3 bg-yellow-400 rounded-full hover:bg-yellow-500"></button>
            <button class="w-3 h-3 bg-green-400 rounded-full hover:bg-green-500"></button>
            <button class="w-3 h-3 bg-red-400 rounded-full hover:bg-red-500" (click)="goBack()"></button>
          </div>
        </div>
      </div>

      <!-- Navigation Bar -->
      <div class="nav-bar bg-white px-4 py-3 border-b border-gray-200 shadow-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button mat-icon-button (click)="goBack()" class="w-8 h-8">
              <mat-icon class="text-gray-600">arrow_back</mat-icon>
            </button>

            <div class="flex items-center space-x-3">
              <span class="text-sm text-gray-500 uppercase tracking-wide font-medium">TEMPLATE</span>
              <input
                class="template-name-input bg-transparent border-none text-lg font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 hover:bg-gray-50"
                [value]="templateName()"
                (input)="updateTemplateName($event)"
                (blur)="autoSave()"
                placeholder="new-template">
            </div>
          </div>

          <div class="flex items-center space-x-1">
            <button
              mat-button
              (click)="saveTemplate()"
              [disabled]="isSaving()"
              class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium text-sm transition-colors">
              {{ isSaving() ? 'SAVING...' : 'SAVE' }}
            </button>

            <button mat-button class="px-3 py-2 text-gray-600 hover:text-gray-900 font-medium text-sm">
              SETTINGS
            </button>

            <button mat-button class="px-3 py-2 text-gray-600 hover:text-gray-900 font-medium text-sm">
              DOWNLOAD
            </button>

            <div class="w-px h-6 bg-gray-300 mx-1"></div>

            <button mat-button class="px-3 py-2 text-gray-600 hover:text-gray-900 font-medium text-sm">
              PDF
            </button>

            <button mat-button class="px-3 py-2 text-gray-600 hover:text-gray-900 font-medium text-sm">
              HTML
            </button>

            <button mat-button class="px-3 py-2 text-gray-600 hover:text-gray-900 font-medium text-sm">
              PNG
            </button>

            <button mat-button class="px-3 py-2 text-gray-600 hover:text-gray-900 font-medium text-sm">
              JPG
            </button>

            <div class="w-px h-6 bg-gray-300 mx-2"></div>

            <div class="flex items-center space-x-2">
              <span class="text-sm text-gray-600 font-mono">{{ zoomLevel() }}%</span>
              <button mat-icon-button class="w-7 h-7" (click)="zoomOut()">
                <mat-icon class="text-gray-600 text-sm">remove</mat-icon>
              </button>
              <button mat-icon-button class="w-7 h-7" (click)="zoomIn()">
                <mat-icon class="text-gray-600 text-sm">add</mat-icon>
              </button>
              <button mat-icon-button class="w-7 h-7">
                <mat-icon class="text-gray-600 text-sm">fullscreen</mat-icon>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Document Sections Tabs -->
      <div class="sections-tabs bg-white border-b border-gray-200">
        <div class="flex">
          <button
            *ngFor="let section of documentSections"
            class="section-tab px-6 py-3 text-sm font-medium border-b-2 transition-colors uppercase tracking-wide"
            [class]="currentSection() === section ? 'text-blue-600 border-blue-600 bg-blue-50' : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50'"
            (click)="setCurrentSection(section)">
            {{ section }}
          </button>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="main-content flex-1 flex overflow-hidden">

        <!-- Left Editor Panel -->
        <div class="editor-panel w-1/2 flex flex-col border-r border-gray-300 bg-white">

          <!-- Editor Toolbar -->
          <div class="editor-toolbar bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <span class="text-sm text-gray-600 font-mono">{{ currentLine() }}</span>
              <span class="text-gray-400">•</span>
              <span class="text-sm text-gray-600">{{ detectedVariables().length }} variables</span>
              <span class="text-gray-400">•</span>
              <span class="text-sm text-gray-600">{{ getCurrentSectionContent().length }} chars</span>
            </div>
            <div class="flex items-center space-x-1">
              <button mat-icon-button class="w-7 h-7" title="Undo">
                <mat-icon class="text-gray-600 text-sm">undo</mat-icon>
              </button>
              <button mat-icon-button class="w-7 h-7" title="Redo">
                <mat-icon class="text-gray-600 text-sm">redo</mat-icon>
              </button>
              <button mat-icon-button class="w-7 h-7" title="Find">
                <mat-icon class="text-gray-600 text-sm">search</mat-icon>
              </button>
              <button mat-icon-button class="w-7 h-7" title="Replace">
                <mat-icon class="text-gray-600 text-sm">find_replace</mat-icon>
              </button>
            </div>
          </div>

          <!-- Monaco Editor -->
          <div class="monaco-container flex-1 relative bg-gray-900">
            <div
              #monacoEditor
              class="w-full h-full">
            </div>
          </div>

          <!-- Bottom Data Panel -->
          <div class="data-panel h-64 border-t border-gray-300 flex flex-col bg-white">
            <!-- Data Tabs -->
            <div class="data-tabs bg-gray-50 border-b border-gray-200">
              <div class="flex">
                <button
                  class="data-tab px-4 py-2 text-sm font-medium border-b-2 transition-colors"
                  [class]="currentDataTab() === 'xml' ? 'text-blue-600 border-blue-600 bg-white' : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100'"
                  (click)="setCurrentDataTab('xml')">
                  XML [SAMPLE DATA]
                </button>
                <button
                  class="data-tab px-4 py-2 text-sm font-medium border-b-2 transition-colors"
                  [class]="currentDataTab() === 'css' ? 'text-blue-600 border-blue-600 bg-white' : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100'"
                  (click)="setCurrentDataTab('css')">
                  CSS
                </button>
                <div class="flex-1"></div>
                <button
                  mat-button
                  class="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  (click)="viewJson()">
                  View JSON
                </button>
              </div>
            </div>

            <!-- Data Content -->
            <div class="data-content flex-1 overflow-hidden bg-gray-900">
              <div
                #dataEditor
                class="w-full h-full"
                *ngIf="currentDataTab() === 'xml'">
              </div>
              <div
                #cssEditor
                class="w-full h-full"
                *ngIf="currentDataTab() === 'css'">
              </div>
            </div>
          </div>
        </div>

        <!-- Right Preview Panel -->
        <div class="preview-panel w-1/2 flex flex-col bg-gray-100">

          <!-- Preview Toolbar -->
          <div class="preview-toolbar bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <span class="text-sm text-gray-700 font-medium">Document Preview</span>
              <div class="flex items-center space-x-2">
                <div class="w-2 h-2 rounded-full"
                     [class]="previewHtml() ? 'bg-green-500' : 'bg-red-500'"></div>
                <span class="text-xs text-gray-500 font-medium">
                  {{ previewHtml() ? 'Rendered' : 'Error' }}
                </span>
              </div>
            </div>

            <div class="flex items-center space-x-1">
              <button mat-icon-button class="w-7 h-7" (click)="updatePreview()" title="Refresh Preview">
                <mat-icon class="text-gray-600 text-sm">refresh</mat-icon>
              </button>
              <button mat-icon-button class="w-7 h-7" title="Fullscreen Preview">
                <mat-icon class="text-gray-600 text-sm">fullscreen</mat-icon>
              </button>
              <button mat-icon-button class="w-7 h-7" title="Export Preview">
                <mat-icon class="text-gray-600 text-sm">download</mat-icon>
              </button>
            </div>
          </div>

          <!-- Preview Content -->
          <div class="preview-content flex-1 overflow-auto p-6 bg-gray-100">
            <div class="preview-document mx-auto">
              <!-- Document Preview -->
              <div
                class="document-preview bg-white shadow-xl border border-gray-200 rounded-lg overflow-hidden min-h-96 relative"
                [innerHTML]="previewHtml()"
                *ngIf="previewHtml()"
                [style.transform]="'scale(' + (zoomLevel() / 100) + ')'">
              </div>

              <!-- Empty State -->
              <div
                *ngIf="!previewHtml()"
                class="empty-preview flex flex-col items-center justify-center min-h-96 text-gray-400 bg-white rounded-lg border-2 border-dashed border-gray-300">
                <div class="w-20 h-20 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <mat-icon class="text-3xl text-blue-500">description</mat-icon>
                </div>
                <h3 class="text-lg font-medium text-gray-600 mb-2">Document Preview</h3>
                <p class="text-sm text-gray-500 text-center max-w-sm mb-4">
                  Start editing your template to see the live preview here
                </p>
                <button
                  mat-raised-button
                  color="primary"
                  (click)="updatePreview()">
                  Generate Preview
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Variables Indicator - HIDDEN to avoid overlapping with XML editor -->
      <!--
      <div class="variables-indicator absolute bottom-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3 max-w-sm"
           *ngIf="detectedVariables().length > 0">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-700">Detected Variables</span>
          <span class="text-xs text-gray-500">{{ detectedVariables().length }}</span>
        </div>
        <div class="flex flex-wrap gap-1">
          <span
            *ngFor="let variable of detectedVariables().slice(0, 5)"
            class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
            {{ '{{' }}{{ variable.name }}{{ '}}' }}
          </span>
          <span
            *ngIf="detectedVariables().length > 5"
            class="text-xs text-gray-500 px-2 py-1">
            +{{ detectedVariables().length - 5 }} more
          </span>
        </div>
      </div>
      -->
    </div>
  `,
  styles: [`
    .prexview-studio {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .menu-bar {
      background: linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%);
    }

    .nav-bar {
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .template-name-input {
      min-width: 150px;
      transition: all 0.2s ease;
    }

    .template-name-input:hover {
      background: rgba(59, 130, 246, 0.05);
    }

    .sections-tabs {
      background: #ffffff;
    }

    .section-tab {
      transition: all 0.2s ease;
      border-bottom-width: 3px;
    }

    .data-tab {
      transition: all 0.2s ease;
      border-bottom-width: 3px;
    }

    .monaco-container {
      background: #1e1e1e;
    }

    .document-preview {
      transform-origin: top center;
      transition: transform 0.2s ease;
    }

    /* Variables indicator styles - DISABLED
    .variables-indicator {
      animation: slideInUp 0.3s ease-out;
    }

    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    */

    .preview-content {
      background: linear-gradient(45deg, #f9fafb 25%, transparent 25%),
                  linear-gradient(-45deg, #f9fafb 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, #f9fafb 75%),
                  linear-gradient(-45deg, transparent 75%, #f9fafb 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    }

    ::ng-deep .mat-mdc-button {
      text-transform: none !important;
      font-weight: 500 !important;
    }

    ::ng-deep .monaco-editor {
      font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace !important;
      font-size: 14px !important;
      line-height: 1.5 !important;
    }
  `]
})
export class TemplateEditorPrexviewComponent implements OnInit, OnDestroy {

  @ViewChild('monacoEditor', { static: false }) monacoEditorElement!: ElementRef;
  @ViewChild('dataEditor', { static: false }) dataEditorElement!: ElementRef;
  @ViewChild('cssEditor', { static: false }) cssEditorElement!: ElementRef;

  // Signals para estado reactivo
  templateName = signal<string>('new-template');
  currentSection = signal<DocumentSection>('body');
  currentDataTab = signal<DataTab>('xml');
  currentLine = signal<number>(1);
  zoomLevel = signal<number>(100);
  isSaving = signal<boolean>(false);
  detectedVariables = signal<TemplateVariable[]>([]);
  previewHtml = signal<SafeHtml>('');
  currentTemplate = signal<Template | null>(null);

  // Monaco editors
  monacoEditor: any;
  dataEditor: any;
  cssEditor: any;

  // Document sections content
  documentSections: DocumentSection[] = ['header', 'body', 'footer', 'pagination'];
  sectionContent = signal<Record<DocumentSection, string>>({
    header: `<div style="border-bottom: 2px solid #6A77D8; padding-bottom: 20px; margin-bottom: 20px;">
	<h1 style="color: #6A77D8; font-size: 2.5rem; margin: 0;">📋 INVOICE</h1>
	<div style="margin-top: 15px;">
		<p><strong>Date issued:</strong> January 1, 1972</p>
		<p><strong>Invoice number:</strong> ID-8387323</p>
		<p><strong>Bill to:</strong> Daniel Osorio (hello@prexview.com)</p>
	</div>
</div>`,
    body: `<div class="body">
	<table>
		<thead>
			<tr>
				<th class="text-left">ID</th>
				<th class="text-left">Description</th>
				<th class="text-right">Price</th>
				<th class="text-right">Quantity</th>
				<th class="text-right">Total</th>
			</tr>
		</thead>
		<tbody>
			{{#each order.product}}
			<tr>
				<td>{{id}}</td>
				<td>
					<b>{{name}}</b>
					<br />
					<span>{{description}}</span>
				</td>
				<td class="text-right">$ {{$currency price}}</td>
				<td class="text-right">{{quantity}}</td>
				<td class="text-right">$ {{$currency total}}</td>
			</tr>
			{{/each}}
		</tbody>
		<tfoot>
			<tr>
				<td></td>
				<td></td>
				<td></td>
				<td class="text-right">Subtotal</td>
				<td class="text-right"><b>$ {{$currency subtotal}}</b></td>
			</tr>
			<tr>
				<td></td>
				<td></td>
				<td></td>
				<td class="text-right">IVA {{tax_rate}}%</td>
				<td class="text-right"><b>$ {{$currency tax}}</b></td>
			</tr>
		</tfoot>
	</table>
	<div class="total">
		<div class="row">
			<div class="col-7">
				<div class="box box-left">
					<h1 class="thanks">Thank you!</h1>
				</div>
			</div>
			<div class="col-5 text-right">
				<div class="box box-right">
					<h2>Total</h2>
					<h1>{{currency}}&nbsp;&nbsp;&nbsp;$ {{$currency total}}</h1>
				</div>
			</div>
		</div>
	</div>
</div>`,
    footer: '',
    pagination: ''
  });

  // Data content
  xmlData = signal<string>(`<invoice
  number="ID-8387323"
  date_issued="1972-01-01 13:42:24"
  currency="USD"
  subtotal="52330"
  tax_rate="16"
  tax="8372.8"
  total="60702.8">
  <bill_to
    name="Daniel Osorio"
    email="hello@prexview.com">
  </bill_to>
  <order>
    <product
      id="3421"
      name="Apple"
      description="Lorem ipsum dolor si amen"
      price="150"
      quantity="75"
      total="11250">
    </product>
    <product
      id="8473"
      name="Banana"
      description="Lorem ipsum dolor si amen"
      price="80"
      quantity="38"
      total="3040">
    </product>
    <product
      id="7820"
      name="Blackberry"
      description="Lorem ipsum dolor si amen"
      price="130"
      quantity="32"
      total="4160">
    </product>
    <product
      id="8734"
      name="Grape"
      description="Lorem ipsum dolor si amen"
      price="180"
      quantity="49"
      total="8820">
    </product>
    <product
      id="8902"
      name="Mango"
      description="Lorem ipsum dolor si amen"
      price="110"
      quantity="28"
      total="3080">
    </product>
    <product
      id="3674"
      name="Pineapple"
      description="Lorem ipsum dolor si amen"
      price="120"
      quantity="13"
      total="1560">
    </product>
    <product
      id="8730"
      name="Watermelon"
      description="Lorem ipsum dolor si amen"
      price="150"
      quantity="120"
      total="18000">
    </product>
    <product
      id="1567"
      name="Lemon"
      description="Lorem ipsum dolor si amen"
      price="30"
      quantity="27"
      total="810">
    </product>
    <product
      id="4783"
      name="Orange"
      description="Lorem ipsum dolor si amen"
      price="70"
      quantity="23"
      total="1610">
    </product>
  </order>
</invoice>`);

  cssData = signal<string>(`
.primary {
  background: #6A77D8;
  color: #fff;
}

.row {
  display: flex;
  flex-wrap: wrap;
  margin: 0 -15px;
}

.col-1, .col-2, .col-3, .col-4, .col-5, .col-6,
.col-7, .col-8, .col-9, .col-10, .col-11, .col-12 {
  padding: 0 15px;
}

.col-3 { width: 25%; }
.col-4 { width: 33.333%; }
.col-5 { width: 41.666%; }
.col-6 { width: 50%; }
.col-7 { width: 58.333%; }
.col-12 { width: 100%; }

.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.header,
.header .col-3,
.header .col-4,
.header .col-5{
  position: relative;
  height: 100%;
}

.header {
  overflow: hidden;
}

.footer {
  height: inherit;
  height: 100%;
}


.relative {
  position: relative;
}

.logo {
  border-top: 8px solid #444;
  position: absolute;
  overflow: hidden;
  background: #6A77D8;
  display: block;
  right: 0px;
  left: 0px;
  top: 0px;
  bottom: 20px;
}

.logo .box {
  display: table;
  width: 100%;
  height: 100%;
  vertical-align: middle;
}

.logo .box .box {
  display: table-cell;
  width: 100%;
  height: 100%;
  text-align: center;
  vertical-align: middle;
}

hr {
  border-color: #6A77D8;
  border-width: 2px;
}

.details {
  position: absolute;
  bottom: 10px;
  width: 100%;
}


.details h1 {
  font-size: 30pt;
  margin: 0px;
  padding: 0px;
}

.details .block {
  margin: 0px;
  padding: 5px 0 5px 5px;
}

.title {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 5px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.block {
  font-size: 1rem;
  color: #1f2937;
  font-weight: 500;
  margin-bottom: 15px;
  padding: 8px 0;
}

table th {
  background: #eee;
  border-bottom: 2px solid #6A77D8;
  padding: 10px 10px;
  color: #6A77D8;
}

table td:first-of-type {
  padding: 10px 10px !important;
}

table td:last-of-type {
  padding: 10px 10px !important;
}

table td {
  vertical-align: top;
  padding: 10px 5px;
}

.thanks {
  font-size: 30pt;
  color: #6A77D8;
  display: inline-block;
  line-height: 80%;
}

.total {
  overflow: hidden;
}

.total .box {
  padding: 20px;
  color: #fff;
  min-height: 90px;
  overflow: hidden;
  position: relative;
}

.total .box-left {
  background: #f3f3f3;

	border-bottom: 8px solid #6A77D8;
}

.total .box-left h1 {
  position: absolute;
  bottom: 14px;
  right: 20px;
  padding: 0px;
  margin: 0px;
}

.total .box-right h1 {
  position: absolute;
  bottom: 20px;
  right: 20px;
  padding: 0px;
  margin: 0px;
}

.total .box-right h2 {
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 0px;
  margin: 0px;
  opacity: 0.5;
}

.total .box-right {
  background: #6A77D8;
  color: #fff;
}

.footer {
  height: 100%;
  border-top: 2px solid #6A77D8;
  padding-top: 10px;
  margin-top: 10px;
}
.body{
  overflow:hidden;
}
.pagination {
  margin: 20px 0 0 0;
  font-size: 8pt;
}

.footer .block {
	padding: 3px 0;
}`);

  // Lifecycle
  private destroy$ = new Subject<void>();

  // Computed properties
  isEditMode = computed(() => !!this.currentTemplate());

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private templateService: TemplateService,
    private storageService: StorageService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.initializeEditor();
    this.loadTemplate();
    this.setupAutoSave();
    // Initialize preview
    setTimeout(() => this.updatePreview(), 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.monacoEditor) this.monacoEditor.dispose();
    if (this.dataEditor) this.dataEditor.dispose();
    if (this.cssEditor) this.cssEditor.dispose();
  }

  /**
   * Inicializa Monaco Editor
   */
  private async initializeEditor(): Promise<void> {
    try {
      if (typeof monaco === 'undefined') {
        await this.loadMonacoEditor();
      }

      setTimeout(() => {
        this.createEditors();
        this.updatePreview();
      }, 100);

    } catch (error) {
      console.error('Error initializing Monaco Editor:', error);
    }
  }

  /**
   * Carga Monaco Editor dinámicamente
   */
  private loadMonacoEditor(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof monaco !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs/loader.js';
      script.onload = () => {
        (window as any).require.config({
          paths: {
            'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs'
          }
        });
        (window as any).require(['vs/editor/editor.main'], () => {
          resolve();
        });
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Crea los editores Monaco
   */
  private createEditors(): void {
    // Main HTML Editor
    if (this.monacoEditorElement) {
      this.monacoEditor = monaco.editor.create(this.monacoEditorElement.nativeElement, {
        value: this.getCurrentSectionContent(),
        language: 'html',
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 14,
        lineNumbers: 'on',
        minimap: { enabled: true },
        wordWrap: 'on',
        folding: true,
        bracketMatching: 'always',
        matchBrackets: 'always'
      });

      this.monacoEditor.onDidChangeModelContent(() => {
        const value = this.monacoEditor.getValue();
        this.updateSectionContent(value);
        this.detectVariables(value);
        this.updatePreview();
      });

      this.monacoEditor.onDidChangeCursorPosition((e: any) => {
        this.currentLine.set(e.position.lineNumber);
      });
    }

    // Crear editores de datos inicial
    this.createDataEditors();
  }

  /**
   * Carga plantilla para edición
   */
  private loadTemplate(): void {
    const templateId = this.route.snapshot.paramMap.get('id');
    if (templateId) {
      this.templateService.templates$.pipe(takeUntil(this.destroy$)).subscribe((templates: any) => {
        const template = templates.find((t: any) => t.id === templateId);
        if (template) {
          this.currentTemplate.set(template);
          this.templateName.set(template.name);

          // Parse content into sections if needed
          this.sectionContent.set({
            header: '',
            body: template.htmlContent || '',
            footer: '',
            pagination: ''
          });

          if (this.monacoEditor) {
            this.monacoEditor.setValue(template.htmlContent || '');
          }
          this.detectVariables(template.htmlContent || '');
        }
      });
    }
  }

  /**
   * Configura auto-guardado
   */
  private setupAutoSave(): void {
    // Auto-save every 30 seconds
    setInterval(() => {
      if (this.templateName() !== 'new-template') {
        this.autoSave();
      }
    }, 30000);
  }

  /**
   * Actualiza nombre de plantilla
   */
  updateTemplateName(event: any): void {
    this.templateName.set(event.target.value);
  }

  /**
   * Cambia sección actual
   */
  setCurrentSection(section: DocumentSection): void {
    this.currentSection.set(section);
    if (this.monacoEditor) {
      this.monacoEditor.setValue(this.getCurrentSectionContent());
    }
  }

  /**
   * Cambia pestaña de datos
   */
  setCurrentDataTab(tab: DataTab): void {
    this.currentDataTab.set(tab);

    // Recrear editores después del cambio de DOM
    setTimeout(() => {
      this.createDataEditors();
    }, 100);
  }

  /**
   * Crea los editores de datos (XML y CSS)
   */
  private createDataEditors(): void {
    if (typeof monaco === 'undefined') return;

    // XML Data Editor
    if (this.currentDataTab() === 'xml' && this.dataEditorElement) {
      if (this.dataEditor) {
        this.dataEditor.dispose();
      }

      this.dataEditor = monaco.editor.create(this.dataEditorElement.nativeElement, {
        value: this.xmlData(),
        language: 'xml',
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 13,
        lineNumbers: 'on',
        minimap: { enabled: false },
        wordWrap: 'on'
      });

      this.dataEditor.onDidChangeModelContent(() => {
        this.xmlData.set(this.dataEditor.getValue());
        this.updatePreview();
      });
    }

    // CSS Editor
    if (this.currentDataTab() === 'css' && this.cssEditorElement) {
      if (this.cssEditor) {
        this.cssEditor.dispose();
      }

      this.cssEditor = monaco.editor.create(this.cssEditorElement.nativeElement, {
        value: this.cssData(),
        language: 'css',
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 13,
        lineNumbers: 'on',
        minimap: { enabled: false },
        wordWrap: 'on'
      });

      this.cssEditor.onDidChangeModelContent(() => {
        this.cssData.set(this.cssEditor.getValue());
        this.updatePreview();
      });
    }
  }

  /**
   * Obtiene contenido de sección actual
   */
  getCurrentSectionContent(): string {
    return this.sectionContent()[this.currentSection()];
  }

  /**
   * Actualiza contenido de sección
   */
  private updateSectionContent(content: string): void {
    const sections = { ...this.sectionContent() };
    sections[this.currentSection()] = content;
    this.sectionContent.set(sections);
  }

  /**
   * Detecta variables en el contenido
   */
  private detectVariables(content: string): void {
    const variableRegex = /\{\{\s*([^}]+)\s*\}\}/g;
    const variables: TemplateVariable[] = [];
    const seen = new Set<string>();
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      const variableName = match[1].trim();
      if (!seen.has(variableName) && !variableName.includes(' ')) {
        seen.add(variableName);
        variables.push({
          name: variableName,
          type: this.inferVariableType(variableName),
          required: true,
          description: this.generateVariableDescription(variableName)
        });
      }
    }

    this.detectedVariables.set(variables);
  }

  /**
   * Infiere tipo de variable
   */
  private inferVariableType(name: string): VariableType {
    const lowerName = name.toLowerCase();

    if (lowerName.includes('date') || lowerName.includes('time')) {
      return VariableType.DATE;
    }
    if (lowerName.includes('amount') || lowerName.includes('price') || lowerName.includes('total')) {
      return VariableType.NUMBER;
    }
    if (lowerName.includes('email')) {
      return VariableType.EMAIL;
    }
    if (lowerName.includes('url') || lowerName.includes('link')) {
      return VariableType.URL;
    }

    return VariableType.STRING;
  }

  /**
   * Genera descripción automática
   */
  private generateVariableDescription(name: string): string {
    const descriptions: { [key: string]: string } = {
      'name': 'Customer or user name',
      'company': 'Company name',
      'email': 'Email address',
      'phone': 'Phone number',
      'address': 'Physical address',
      'date': 'Date value',
      'amount': 'Monetary amount',
      'total': 'Total amount',
      'title': 'Document title'
    };

    return descriptions[name.toLowerCase()] || `Dynamic value for ${name}`;
  }

  /**
   * Parsea XML a JSON manteniendo estructura anidada
   */
  private parseXmlToJson(xmlString: string): any {
    try {
      // Handle both <data> and <invoice> root elements
      const invoiceMatch = xmlString.match(/<invoice([^>]*)>([\s\S]*)<\/invoice>/);
      if (invoiceMatch) {
        const result: any = {};

        // Parse attributes from the invoice tag
        const attributesString = invoiceMatch[1];
        const attributeRegex = /(\w+)="([^"]*)"/g;
        let attrMatch;

        while ((attrMatch = attributeRegex.exec(attributesString)) !== null) {
          result[attrMatch[1]] = attrMatch[2];
        }

        const innerXml = invoiceMatch[2];

        // Parse bill_to
        const billToMatch = innerXml.match(/<bill_to([^>]*)>/);
        if (billToMatch) {
          result.bill_to = {};
          const billToAttrRegex = /(\w+)="([^"]*)"/g;
          let billToAttrMatch;

          while ((billToAttrMatch = billToAttrRegex.exec(billToMatch[1])) !== null) {
            result.bill_to[billToAttrMatch[1]] = billToAttrMatch[2];
          }
        }

        // Parse order and products
        const orderMatch = innerXml.match(/<order>([\s\S]*?)<\/order>/);
        if (orderMatch) {
          result.order = { product: [] };
          const productRegex = /<product([^>]*)>/g;
          let productMatch;

          while ((productMatch = productRegex.exec(orderMatch[1])) !== null) {
            const product: any = {};
            const productAttrRegex = /(\w+)="([^"]*)"/g;
            let productAttrMatch;

            while ((productAttrMatch = productAttrRegex.exec(productMatch[1])) !== null) {
              product[productAttrMatch[1]] = productAttrMatch[2];
            }

            result.order.product.push(product);
          }
        }

        return result;
      }

      // Fallback for old <data> format
      const dataMatch = xmlString.match(/<data>([\s\S]*)<\/data>/);
      if (dataMatch) {
        const result: any = {};
        const innerXml = dataMatch[1];

        // Parse elementos de primer nivel
        const topLevelRegex = /<(\w+)>([^<]+)<\/\1>/g;
        let match;

        while ((match = topLevelRegex.exec(innerXml)) !== null) {
          const tagName = match[1];
          const value = match[2].trim();
          if (!result[tagName]) {
            result[tagName] = value;
          }
        }

        return result;
      }

      return {};
    } catch (error) {
      console.error('XML parsing error:', error);
      return {};
    }
  }

  /**
   * Aplica scope CSS para que solo afecte al preview document
   */
  private scopeCSSToPreview(css: string): string {
    if (!css) return '';

    // Reemplazar selectores CSS para que solo afecten al preview
    const scopedCSS = css
      // Agregar prefijo .document-preview-content a selectores que no lo tengan
      .replace(/([^{}]*){/g, (match, selector) => {
        // Evitar afectar @import, @media, @keyframes, etc.
        if (selector.trim().startsWith('@')) {
          return match;
        }

        // Limpiar selector y agregar scope
        const cleanSelector = selector.trim();
        if (!cleanSelector.includes('.document-preview-content')) {
          // Si el selector es 'body', reemplazarlo por nuestro contenedor
          if (cleanSelector === 'body') {
            return '.document-preview-content {';
          }
          // Para otros selectores, agregar el prefijo
          return `.document-preview-content ${cleanSelector} {`;
        }
        return match;
      });

    return scopedCSS;
  }

  /**
   * Actualiza vista previa
   */
  updatePreview(): void {
    try {
      // Combine all sections to create the full document
      const sections = this.sectionContent();
      const fullContent = `
        ${sections.header}
        ${sections.body}
        ${sections.footer}
        ${sections.pagination}
      `.trim();

      let xmlDataParsed: any = {};

      // Parse XML data to JSON with better structure handling
      if (this.xmlData()) {
        xmlDataParsed = this.parseXmlToJson(this.xmlData());
      }

      this.templateService.compileTemplate(fullContent, xmlDataParsed).subscribe({
        next: (rendered: string) => {
          // Add CSS styles scoped to preview document only
          const scopedCSS = this.scopeCSSToPreview(this.cssData());
          const styledContent = `
            <style>${scopedCSS}</style>
            <div class="document-preview-content">
              ${rendered}
            </div>
          `;
          this.previewHtml.set(this.sanitizer.bypassSecurityTrustHtml(styledContent));
        },
        error: (error: any) => {
          console.error('Preview error:', error);
          this.previewHtml.set('');
        }
      });
    } catch (error) {
      console.error('Preview error:', error);
      this.previewHtml.set('');
    }
  }

  /**
   * Zoom in
   */
  zoomIn(): void {
    const current = this.zoomLevel();
    if (current < 200) {
      this.zoomLevel.set(Math.min(200, current + 25));
    }
  }

  /**
   * Zoom out
   */
  zoomOut(): void {
    const current = this.zoomLevel();
    if (current > 50) {
      this.zoomLevel.set(Math.max(50, current - 25));
    }
  }

  /**
   * Ver JSON
   */
  viewJson(): void {
    // Convert XML to JSON for display
    try {
      const xmlContent = this.xmlData();
      let jsonData: any = {};

      const dataMatch = xmlContent.match(/<data>([\s\S]*)<\/data>/);
      if (dataMatch) {
        const innerXml = dataMatch[1];
        const tagRegex = /<(\w+)>(.*?)<\/\1>/g;
        let match;
        while ((match = tagRegex.exec(innerXml)) !== null) {
          jsonData[match[1]] = match[2].trim();
        }
      }

      alert(JSON.stringify(jsonData, null, 2));
    } catch (error) {
      alert('Error parsing XML data');
    }
  }

  /**
   * Auto-guardado
   */
  async autoSave(): Promise<void> {
    if (this.templateName() && this.templateName() !== 'new-template') {
      try {
        const templateData = {
          name: this.templateName(),
          description: 'Template created with PrexView Studio',
          htmlContent: Object.values(this.sectionContent()).join('\n\n'),
          status: TemplateStatus.DRAFT,
          variables: this.detectedVariables(),
          metadata: {
            category: 'other',
            tags: [],
            version: '1.0.0'
          }
        };

        if (this.isEditMode()) {
          await this.templateService.saveTemplate({
            ...templateData,
            id: this.currentTemplate()!.id
          }).toPromise();
        }
      } catch (error) {
        console.error('Auto-save error:', error);
      }
    }
  }

  /**
   * Guarda plantilla
   */
  async saveTemplate(): Promise<void> {
    this.isSaving.set(true);

    try {
      const templateData = {
        name: this.templateName(),
        description: 'Template created with PrexView Studio',
        htmlContent: Object.values(this.sectionContent()).join('\n\n'),
        status: TemplateStatus.ACTIVE,
        variables: this.detectedVariables(),
        metadata: {
          category: 'other',
          tags: [],
          version: '1.0.0'
        }
      };

      if (this.isEditMode()) {
        const updated = await this.templateService.saveTemplate({
          ...templateData,
          id: this.currentTemplate()!.id
        }).toPromise();
        this.currentTemplate.set(updated!);
      } else {
        const created = await this.templateService.saveTemplate(templateData).toPromise();
        this.currentTemplate.set(created!);
        this.router.navigate(['/template-editor', created!.id], { replaceUrl: true });
      }

      console.log('Template saved successfully');
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * Volver al dashboard
   */
  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
