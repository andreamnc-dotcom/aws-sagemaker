import { mergeApplicationConfig, ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { AwsService } from './services/aws.service';
import { getAwsConfig } from './services/aws-config';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    {
      provide: APP_INITIALIZER,
      useFactory: (awsService: AwsService) => async () => {
        const config = await getAwsConfig();
        await awsService.init(config);
      },
      deps: [AwsService],
      multi: true
    }
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);