const vehicle=[['customer','Customer'],['phone','Phone'],['date','Date'],['ro','RO / Invoice'],['technician','Technician'],['year','Year'],['make','Make'],['model','Model'],['mileage','Mileage'],['vin','VIN'],['plate','License Plate'],['state','State Registered']];
const sections={
'TIRES & WHEELS':['LF Tire Tread Depth / Condition','RF Tire Tread Depth / Condition','LR Tire Tread Depth / Condition','RR Tire Tread Depth / Condition','Spare Tire / Mount / Pressure','Wheel / Lug Nut Condition'],
'BRAKES':['Front Brake Pads / Rotors - Left','Front Brake Pads / Rotors - Right','Rear Disc Pads / Rotors - Left (if equipped)','Rear Disc Pads / Rotors - Right (if equipped)','Rear Drum Brakes / Shoes - Left (if equipped)','Rear Drum Brakes / Shoes - Right (if equipped)','Brake Hoses / Hard Lines / Leaks','Parking Brake Operation'],
'STEERING & FRONT SUSPENSION':['Upper Ball Joints - Left / Right','Lower Ball Joints - Left / Right','Inner Tie Rods - Left / Right','Outer Tie Rod Ends - Left / Right','Steering Rack / Boots / Mounts','Wheel Bearings / Hub Play'],
'SUSPENSION & CHASSIS':['Front Shocks / Struts / Coilovers','Rear Shocks','Front Springs / Coil Springs','Rear Leaf Springs / Bushings / Shackles','Upper Control Arms / Bushings','Lower Control Arms / Bushings','Sway Bar / Links / Bushings','Frame / Crossmembers / Mounting Points','Body Mounts'],
'DRIVETRAIN & 4WD':['Front CV Axles / Boots','Front Differential / Seals / Fluid Leaks','Rear Differential / Seals / Fluid Leaks','Transfer Case / Seals / Fluid Leaks','Front Driveshaft / U-joints / Slip Joint','Rear Driveshaft / U-joints / Carrier Bearing','4WD Engagement / Operation','Transmission Fluid / Leaks / Operation'],
'ENGINE & UNDERHOOD':['Engine Oil Level / Condition / Leaks','Coolant Level / Condition / Leaks','Belts / Tensioners / Pulleys','Radiator / Hoses / Cooling System','Battery / Terminals / Hold-down','Air Filter / Intake System','Visible Engine / Valve Cover / Timing Cover Leaks','Power Steering Fluid / Leaks (if equipped)'],
'LIGHTING & ELECTRICAL':['Headlights - Low / High Beam','Fog Lights','Front Turn Signals / Marker Lights','Rear Turn Signals / Tail Lights','Brake Lights / Center High-Mount Stop Lamp','Reverse Lights','License Plate Lights','Horn','Wipers / Washer System','Dash Warning Lights / Charging Indicator'],
'EXHAUST, ARMOR & OFF-ROAD EQUIPMENT':['Exhaust System / Hangers / Leaks','Skid Plates / Mounting Hardware','Rock Sliders / Steps / Mounts','Bumpers / Recovery Points','Winch / Fairlead / Mounting (if equipped)','Aftermarket Suspension / Lift Components','Accessory Wiring / Switches - visual condition only'],
'SAFETY & GENERAL CONDITION':['Windshield / Mirrors / Glass','Seat Belts / Latches','Doors / Hood / Tailgate Latches','Fluid Leaks Under Vehicle','Road Test - Steering / Braking / Noise / Vibration']};
const states=['','AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];
const vf=document.getElementById('vehicleFields');vehicle.forEach(([id,label])=>{const l=document.createElement('label');l.textContent=label;if(id==='state'){const s=document.createElement('select');s.id=id;states.forEach(x=>s.add(new Option(x,x)));l.appendChild(s)}else{const i=document.createElement('input');i.id=id;i.type=id==='date'?'date':id==='phone'?'tel':'text';l.appendChild(i)}vf.appendChild(l)});document.getElementById('date').value=new Date().toISOString().slice(0,10);
const root=document.getElementById('sections');let idx=0;Object.entries(sections).forEach(([name,items])=>{const sec=document.createElement('section');sec.className='card';sec.innerHTML=`<h2>${name}</h2>`;items.forEach(title=>{const id='i'+idx++;const d=document.createElement('div');d.className='item';d.dataset.id=id;d.innerHTML=`<div class="item-title">${title}</div><div class="status"><button data-v="G" type="button">GREEN</button><button data-v="Y" type="button">YELLOW</button><button data-v="R" type="button">RED</button></div><div class="notes"><input class="measurement" placeholder="Measurement / notes"></div>`;d.querySelectorAll('.status button').forEach(b=>b.onclick=()=>{if(b.classList.contains('active')){b.classList.remove('active');updateCounts();autoSave();return;}d.querySelectorAll('.status button').forEach(x=>x.classList.remove('active'));b.classList.add('active');updateCounts();autoSave()});d.querySelector('input').addEventListener('input',autoSave);sec.appendChild(d)});root.appendChild(sec)});
function data(){const out={vehicle:{},items:{},photos:inspectionPhotos,summary:summary.value,priority:priority.value,signature:signature.value,advised:advised.value};vehicle.forEach(([id])=>out.vehicle[id]=document.getElementById(id).value);document.querySelectorAll('.item').forEach(d=>out.items[d.dataset.id]={status:d.querySelector('.active')?.dataset.v||'',notes:d.querySelector('.measurement').value});return out}
function restore(o){if(!o)return;Object.assign(inspectionPhotos,o.photos||{});Object.entries(o.vehicle||{}).forEach(([k,v])=>{if(document.getElementById(k))document.getElementById(k).value=v});Object.entries(o.items||{}).forEach(([id,v])=>{const d=document.querySelector(`[data-id="${id}"]`);if(d){if(v.status)d.querySelector(`[data-v="${v.status}"]`)?.classList.add('active');d.querySelector('.measurement').value=v.notes||''}});summary.value=o.summary||'';priority.value=o.priority||'';signature.value=o.signature||'';advised.value=o.advised||'';updateCounts()}
function autoSave(){localStorage.setItem('halesInspectionDraft',JSON.stringify(data()))}function updateCounts(){let c={G:0,Y:0,R:0,U:0};document.querySelectorAll('.item').forEach(d=>{const v=d.querySelector('.active')?.dataset.v;c[v||'U']++});counts.innerHTML=`<span class="pill">🟢 ${c.G} Good</span><span class="pill">🟡 ${c.Y} Monitor</span><span class="pill">🔴 ${c.R} Repair</span><span class="pill">${c.U} Unmarked</span>`}
document.querySelectorAll('input,select,textarea').forEach(x=>x.addEventListener('change',autoSave));saveBtn.onclick=()=>{autoSave();alert('Inspection saved on this device.')};newBtn.onclick=()=>{if(confirm('Clear this inspection and start a new one?')){localStorage.removeItem('halesInspectionDraft');location.reload()}};reportBtn.onclick=()=>window.print();restore(JSON.parse(localStorage.getItem('halesInspectionDraft')||'null'));updateCounts();if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
const inspectionPhotos = {};
// SECTION-SPECIFIC INSPECTION PHOTO SYSTEM
const PHOTO_MAX_WIDTH = 1200;
const PHOTO_MAX_HEIGHT = 1200;
const PHOTO_QUALITY = 0.72;

function compressInspectionPhoto(file, callback) {
  const reader = new FileReader();

  reader.onload = event => {
    const img = new Image();

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      const scale = Math.min(
        1,
        PHOTO_MAX_WIDTH / width,
        PHOTO_MAX_HEIGHT / height
      );

      width = Math.round(width * scale);
      height = Math.round(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedPhoto = canvas.toDataURL(
        'image/jpeg',
        PHOTO_QUALITY
      );

      callback(compressedPhoto);
    };

    img.src = event.target.result;
  };

  reader.readAsDataURL(file);
}

document.querySelectorAll('#sections .card').forEach(section => {
  const sectionTitle = section.querySelector('h2');
  if (!sectionTitle) return;

  const photoArea = document.createElement('div');
  photoArea.className = 'section-photo-area';

  photoArea.innerHTML = `
    <div class="section-photo-heading">
      INSPECTION PHOTO — ${sectionTitle.textContent}
    </div>

    <label class="section-photo-control">
      Add Inspection Photo
      <input
        type="file"
        accept="image/*"
        class="section-photo-input"
        multiple
      >
    </label>

    <div class="section-photo-gallery"></div>
  `;

  section.appendChild(photoArea);

  const input = photoArea.querySelector('.section-photo-input');
  const gallery = photoArea.querySelector('.section-photo-gallery');

  input.addEventListener('change', () => {
    Array.from(input.files).forEach(file => {
      if (!file.type.startsWith('image/')) return;

      compressInspectionPhoto(file, compressedPhoto => {
        const photo = document.createElement('div');
        const sectionKey = sectionTitle.textContent;
        if (!inspectionPhotos[sectionKey]) inspectionPhotos[sectionKey] = [];
        inspectionPhotos[sectionKey].push({ image: compressedPhoto, notes: '' });
        autoSave();
        photo.className = 'section-inspection-photo';

        photo.innerHTML = `
          <img src="${compressedPhoto}" alt="Inspection photo">

          <textarea
            placeholder="Photo notes / condition / location"
          ></textarea>

          <button
            type="button"
            class="secondary section-remove-photo"
          >
            Remove Photo
          </button>
        `;
        const photoRecord = inspectionPhotos[sectionKey][inspectionPhotos[sectionKey].length - 1];
        photo.querySelector('textarea').addEventListener('input', e => { photoRecord.notes = e.target.value; autoSave(); });        photo
          .querySelector('.section-remove-photo')
          .addEventListener('click', () => {
inspectionPhotos[sectionKey] = inspectionPhotos[sectionKey].filter(p => p !== photoRecord);
            autoSave();
            photo.remove();
          });

        gallery.appendChild(photo);
      });
    });

    input.value = '';
  });
});
