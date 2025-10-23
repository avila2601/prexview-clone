export const InvoiceTemplate = {
  header: `{{#with invoice}}
<div class="row header">
	<div class="col-3 relative">
		<div class="logo">
			<div class="box">
				<div class="box">
					{{$icon
						"party_mode"
						library="material-design"
						width=80
						height=80
						fit=true
						color="#fff"
					}}
				</div>
			</div>
		</div>
	</div>
	<div class="col-4 text-center"></div>
	<div class="col-5">
		<div class="details">
			<h1>Invoice</h1>
			<hr />
			<div class="row">
				<div class="col-6">
					<div class="title"><b>Date issued</b></div>
					<div class="block">{{$date _date_issued}}</div>
				</div>
				<div class="col-6">
					<div class="title"><b>Invoice number</b></div>
					<div class="block">{{_number}}</div>
				</div>
				<div class="col-12">
					<div class="title"><b>Bill to</b></div>
					<div class="block">{{bill_to._name}} ({{bill_to._email}})</div>
				</div>
			</div>
		</div>
	</div>
</div>
{{/with}}`,

  body: `{{#with invoice}}
<div class="body">
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
				<td>{{_id}}</td>
				<td>
					<b>{{_name}}</b>
					<br />
					<span>{{_description}}</span>
				</td>
				<td class="text-right">$ {{$currency _price}}</td>
				<td class="text-right">{{_quantity}}</td>
				<td class="text-right">$ {{$currency _total}}</td>
			</tr>
			{{/each}}
		</tbody>
		<tfoot>
			<tr>
				<td></td>
				<td></td>
				<td></td>
				<td class="text-right">Subtotal</td>
				<td class="text-right"><b>$ {{$currency _subtotal}}</b></td>
			</tr>
			<tr>
				<td></td>
				<td></td>
				<td></td>
				<td class="text-right">IVA {{_tax_rate}}%</td>
				<td class="text-right"><b>$ {{$currency _tax}}</b></td>
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
					<h1>{{currency}}&nbsp;&nbsp;&nbsp;$ {{$currency _total}}</h1>
				</div>
			</div>
		</div>
	</div>
</div>
{{/with}}`,

  footer: `{{#with invoice}}
<div class="footer">
	<div class="row">
		<div class="col-8">
			<div class="thanks">
				Thanks!
			</div>
			<br />
			<div class="row">
				<div class="col-12">
					<div class="block"><b>Payment instructions</b></div>
					<div class="block">{{payment_instructions}}</div>
				</div>
			</div>
		</div>
		<div class="col-4">
			<div class="total">
				<div class="box box-left">
					<h1>$ {{$currency order._subtotal}}</h1>
				</div>
				<div class="box box-right">
					<h2>TOTAL</h2>
					<h1>$ {{$currency order._total}}</h1>
				</div>
			</div>
		</div>
	</div>
</div>
{{/with}}`,

  pagination: `<div class="pagination">
	Page {{_page}} of {{_pages}}
</div>`
};
