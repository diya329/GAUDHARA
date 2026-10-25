import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Wifi, 
  Battery, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Activity, 
  Wrench,
  Radio,
  Server
} from 'lucide-react';
import type { HardwareDevice } from '../../types';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

export const HardwareDevicesView: React.FC = () => {
  const { t } = useLanguage();
  const [devices, setDevices] = useState<HardwareDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [calibratingId, setCalibratingId] = useState<string | null>(null);

  useEffect(() => {
    api.getDevices().then((data) => {
      setDevices(data);
      setLoading(false);
    });
  }, []);

  const handleCalibrate = (id: string) => {
    setCalibratingId(id);
    setTimeout(() => {
      setCalibratingId(null);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
              {t.hardwareTitle}
            </h1>
            <span className="text-[10px] font-semibold text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded border border-[#FDE68A] uppercase font-mono">
              {t.activeSensors}
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            {t.hardwareSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-[#166534] bg-[#DCFCE7] px-2.5 py-1 rounded border border-[#86EFAC] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
            <span>3 {t.activeSensors}</span>
          </span>
        </div>
      </div>

      {/* Device Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {devices.map((device) => {
          const isCalibrating = calibratingId === device.id;

          return (
            <div
              key={device.id}
              className="bg-white border border-[#E2E8F0] rounded-lg p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded bg-[#F1F5F3] text-[#1B4332]">
                      {device.device_type === 'inline_chamber' && <Cpu className="w-5 h-5" />}
                      {device.device_type === 'handheld_probe' && <Activity className="w-5 h-5" />}
                      {device.device_type === 'parlor_hub' && <Server className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-[#0F172A] leading-tight">
                        {device.name}
                      </h3>
                      <span className="font-mono text-[10px] text-[#64748B]">
                        {device.device_id}
                      </span>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#166534] bg-[#DCFCE7] px-2 py-0.5 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                    <span>ONLINE</span>
                  </span>
                </div>

                <div className="p-3 bg-[#F8FAF9] rounded border border-[#E2E8F0] text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">{t.milkingParlor}:</span>
                    <strong className="text-[#0F172A]">{device.assigned_parlor}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Firmware:</span>
                    <span className="font-mono text-[#0F172A]">{device.firmware_version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">{t.temperatureC}:</span>
                    <span className="font-mono text-[#0F172A]">{device.current_temperature_c} °C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">{t.batteryLevel}:</span>
                    <span className="font-mono font-bold text-[#166534]">{device.battery_level_pct}%</span>
                  </div>
                </div>

                {/* Sensor Health Diagnostic Matrix */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider block">
                    {t.calibrationStatus}
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div className="p-1.5 rounded bg-[#F8FAF9] border border-[#E2E8F0] flex items-center justify-between">
                      <span className="text-[11px] text-[#64748B]">{t.electricalConductivity}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                    </div>
                    <div className="p-1.5 rounded bg-[#F8FAF9] border border-[#E2E8F0] flex items-center justify-between">
                      <span className="text-[11px] text-[#64748B]">{t.phLevel}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                    </div>
                    <div className="p-1.5 rounded bg-[#F8FAF9] border border-[#E2E8F0] flex items-center justify-between">
                      <span className="text-[11px] text-[#64748B]">{t.opticalDensity}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                    </div>
                    <div className="p-1.5 rounded bg-[#F8FAF9] border border-[#E2E8F0] flex items-center justify-between">
                      <span className="text-[11px] text-[#64748B]">{t.temperatureC}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Calibration action */}
              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                <span className="text-[#94A3B8] font-mono text-[10px]">
                  {new Date(device.last_heartbeat).toLocaleTimeString()}
                </span>
                <button
                  onClick={() => handleCalibrate(device.id)}
                  disabled={isCalibrating}
                  className="px-2.5 py-1 text-xs font-medium text-[#1B4332] hover:bg-[#F1F5F3] border border-[#CBD5CD] rounded flex items-center gap-1.5 disabled:opacity-50"
                  title={t.calibrationStatus}
                >
                  <RefreshCw className={`w-3 h-3 ${isCalibrating ? 'animate-spin' : ''}`} />
                  <span>{isCalibrating ? t.loading : t.calibrationStatus}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sensor Calibration Protocol Guide */}
      <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] space-y-3">
        <h3 className="font-bold text-sm text-[#0F172A]">
          {t.calibrationStatus} &amp; {t.thresholdStandard}
        </h3>
        <p className="text-xs text-[#475569] leading-relaxed">
          {t.qdrExplanation}
        </p>
      </div>
    </div>
  );
};
