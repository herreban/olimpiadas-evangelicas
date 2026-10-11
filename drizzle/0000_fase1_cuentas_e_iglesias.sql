CREATE TYPE "public"."rol" AS ENUM('plataforma', 'admin_iglesia', 'voluntario');--> statement-breakpoint
CREATE TYPE "public"."tipo_invitacion" AS ENUM('iglesia', 'usuario', 'recuperacion');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iglesias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"ciudad" text NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"testigo" text NOT NULL,
	"tipo" "tipo_invitacion" NOT NULL,
	"iglesia_id" uuid,
	"rol" "rol",
	"usuario_destino_id" text,
	"datos" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"creada_por" text NOT NULL,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"caduca_en" timestamp with time zone NOT NULL,
	"anulada_en" timestamp with time zone,
	"usada_en" timestamp with time zone,
	"usada_por" text,
	CONSTRAINT "invitaciones_testigo_unique" UNIQUE("testigo"),
	CONSTRAINT "invitaciones_iglesia_segun_tipo" CHECK (("invitaciones"."tipo" = 'iglesia') = ("invitaciones"."iglesia_id" is null)),
	CONSTRAINT "invitaciones_destino_segun_tipo" CHECK (("invitaciones"."tipo" = 'recuperacion') = ("invitaciones"."usuario_destino_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "perfiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" text NOT NULL,
	"iglesia_id" uuid,
	"rol" "rol" NOT NULL,
	"nombre_mostrado" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "perfiles_usuario_id_unique" UNIQUE("usuario_id"),
	CONSTRAINT "perfiles_iglesia_segun_rol" CHECK (("perfiles"."rol" = 'plataforma') = ("perfiles"."iglesia_id" is null))
);
--> statement-breakpoint
CREATE TABLE "registro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"iglesia_id" uuid,
	"usuario_id" text,
	"accion" text NOT NULL,
	"entidad" text NOT NULL,
	"entidad_id" text,
	"datos" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"momento" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"username" text,
	"display_username" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitaciones" ADD CONSTRAINT "invitaciones_iglesia_id_iglesias_id_fk" FOREIGN KEY ("iglesia_id") REFERENCES "public"."iglesias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitaciones" ADD CONSTRAINT "invitaciones_usuario_destino_id_user_id_fk" FOREIGN KEY ("usuario_destino_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitaciones" ADD CONSTRAINT "invitaciones_creada_por_user_id_fk" FOREIGN KEY ("creada_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitaciones" ADD CONSTRAINT "invitaciones_usada_por_user_id_fk" FOREIGN KEY ("usada_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfiles" ADD CONSTRAINT "perfiles_usuario_id_user_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfiles" ADD CONSTRAINT "perfiles_iglesia_id_iglesias_id_fk" FOREIGN KEY ("iglesia_id") REFERENCES "public"."iglesias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro" ADD CONSTRAINT "registro_iglesia_id_iglesias_id_fk" FOREIGN KEY ("iglesia_id") REFERENCES "public"."iglesias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro" ADD CONSTRAINT "registro_usuario_id_user_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invitaciones_iglesia_idx" ON "invitaciones" USING btree ("iglesia_id");--> statement-breakpoint
CREATE INDEX "perfiles_iglesia_idx" ON "perfiles" USING btree ("iglesia_id");--> statement-breakpoint
CREATE INDEX "registro_iglesia_momento_idx" ON "registro" USING btree ("iglesia_id","momento");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");