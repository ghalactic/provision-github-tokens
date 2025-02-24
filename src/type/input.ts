export type AppInput = {
  appId: string;
  privateKey: string;
  issuer: AppInputIssuer;
  provisioner: AppInputProvisioner;
};

export type AppInputIssuer = {
  enabled: boolean;
  roles: string[];
};

export type AppInputProvisioner = {
  enabled: boolean;
};
