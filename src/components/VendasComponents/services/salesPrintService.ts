import { SaleOrder } from '../types';

export const handlePrintSaleOrder = (order: SaleOrder, clients: any[], settings: any) => {
  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const orderClient = clients.find(c => c.id === order.client_id);
  
  const cssStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    @page { margin: 15mm; size: auto; }
    body { font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.4; padding: 0; margin: 0; background: white; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid ${settings.primaryColor || '#202eac'}; padding-bottom: 20px; margin-bottom: 30px; }
    .company-name { font-size: 24px; font-weight: 900; color: #0f172a; }
    .doc-title { text-align: right; }
    .doc-title h1 { font-size: 18px; font-weight: 900; color: ${settings.primaryColor || '#202eac'}; margin: 0; text-transform: uppercase; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px; margin-bottom: 30px; }
    .section-title { font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
    .data-row { margin-bottom: 5px; font-size: 12px; }
    .label { font-weight: 700; color: #475569; }
    table { width: 100%; border-collapse: collapse; margin: 30px 0; }
    th { background: #f8fafc; text-align: left; padding: 12px; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
    td { padding: 12px; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
    .total-card { background: #f8fafc; border-radius: 12px; padding: 20px; margin-left: auto; width: 250px; }
    .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
    .final-total { border-top: 2px solid #e2e8f0; margin-top: 10px; padding-top: 10px; font-size: 18px; font-weight: 900; color: ${settings.primaryColor || '#202eac'}; }
    .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding: 10px 0; }
  `;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Pedido de Venda - ${order.number}</title>
      <style>${cssStyles}</style>
    </head>
    <body>
      <div class="header">
        <div style="display: flex; align-items: center; gap: 15px;">
          ${settings.logo ? `<img src="${settings.logo}" style="height: 60px;" />` : `<div style="width:50px; height:50px; background:${settings.primaryColor || '#202eac'}; border-radius:12px;"></div>`}
          <div>
            <div class="company-name">${settings.name}</div>
            <div style="font-size: 10px; color: #64748b;">${settings.document ? `CNPJ: ${settings.document}` : ''}</div>
            <div style="font-size: 10px; color: #64748b;">${settings.address || ''}</div>
          </div>
        </div>
        <div class="doc-title">
          <h1>Pedido de Venda</h1>
          <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${order.number}</div>
        </div>
      </div>

      <div class="grid">
        <div>
          <div class="section-title">Dados do Cliente</div>
          <div class="data-row"><span class="label">Cliente:</span> ${order.client_name}</div>
          <div class="data-row"><span class="label">Documentos:</span> ${orderClient?.document || '-'}</div>
          <div class="data-row"><span class="label">Telefone:</span> ${orderClient?.phone || '-'}</div>
          <div class="data-row"><span class="label">Endereço:</span> ${orderClient?.address || ''}, ${orderClient?.neighborhood || ''}</div>
          <div class="data-row">${orderClient?.city || ''} / ${orderClient?.state || ''}</div>
        </div>
        <div>
          <div class="section-title">Dados do Pedido</div>
          <div class="data-row"><span class="label">Data de Emissão:</span> ${new Date(order.created_at).toLocaleDateString()}</div>
          <div class="data-row"><span class="label">Método de Entrega:</span> ${order.delivery_method.toUpperCase()}</div>
          <div class="data-row"><span class="label">Status:</span> ${order.status.toUpperCase()}</div>
          ${order.expected_delivery_date ? `<div class="data-row"><span class="label">Previsão de Entrega:</span> ${new Date(order.expected_delivery_date).toLocaleDateString()}</div>` : ''}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Cód.</th>
            <th>Produto</th>
            <th style="text-align: right;">Qtd.</th>
            <th style="text-align: right;">Preço Unit.</th>
            <th style="text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map(item => `
            <tr>
              <td style="font-family: monospace; color: #64748b;">${item.finished_good_id.split('-')[0]}</td>
              <td style="font-weight: 700;">${item.name}</td>
              <td style="text-align: right; font-weight: 700;">${item.quantity}</td>
              <td style="text-align: right;">${formatBRL(item.unit_price)}</td>
              <td style="text-align: right; font-weight: 700;">${formatBRL(item.subtotal)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="total-card">
        <div class="total-row"><span>Subtotal:</span> <span>${formatBRL(order.total_value)}</span></div>
        <div class="total-row"><span>Desconto:</span> <span>${formatBRL(order.discount || 0)}</span></div>
        <div class="final-total">
          <div style="font-size: 10px; color: #64748b; font-weight: 800; text-transform: uppercase;">Total do Pedido</div>
          <div>${formatBRL(order.final_value)}</div>
        </div>
      </div>

      ${order.notes ? `
        <div style="margin-top: 40px;">
          <div class="section-title">Observações</div>
          <div style="font-size: 11px; color: #475569;">${order.notes}</div>
        </div>
      ` : ''}

      <div style="margin-top: 60px; display: flex; gap: 50px;">
        <div style="flex: 1; border-top: 1px solid #cbd5e1; padding-top: 10px; text-align: center; font-size: 10px; color: #64748b;">Assinatura do Cliente</div>
        <div style="flex: 1; border-top: 1px solid #cbd5e1; padding-top: 10px; text-align: center; font-size: 10px; color: #64748b;">Responsável Ohana Clean</div>
      </div>

      <div class="footer">${settings.name} - MicroSaaS Industrial Planner</div>
    </body>
    </html>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  iframe.contentDocument?.write(html);
  iframe.contentDocument?.close();
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }, 500);
};
